// Orchestration: assemble PlayerGameContexts for every eligible batter
// in today's slate by joining service outputs, then score them.
//
// Lives under lib/scoring/ because it's the bridge between the data layer
// and the scoring engine; the API route just calls this and the parlay
// builder.

import { withCache } from "@/lib/cache";
import { env } from "@/lib/utils/env";
import { log } from "@/lib/utils/logger";
import { mlb, savant, fangraphs, weather, parks } from "@/lib/services";
import { scoreAndRank } from "@/lib/scoring";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import type { PlayerGameContext, ScheduledGame, Score, TeamId } from "@/types";

export interface DailyScoredPlayer extends Score {
  teamId: TeamId;
}

/**
 * Build + score every confirmed batter for `date`. Cached so multiple
 * /api/parlays calls within a window share the work.
 */
export async function getDailyScoredPlayers(date: string): Promise<DailyScoredPlayer[]> {
  return withCache(`daily-scored:${date}`, env.CACHE_TTL_LINEUPS_S, async () => {
    const games = await mlb.getSchedule(date);
    log.info("orchestrate start", { date, games: games.length });

    const season = Number(date.slice(0, 4));
    // Pull the heavy season-level datasets once and reuse.
    const [batterCast, pitcherCast, pitcherFG] = await Promise.all([
      savant.getBatterStatcastSeason(season),
      savant.getPitcherStatcastSeason(season),
      fangraphs.getPitcherAdvancedSeason(season),
    ]);

    // Build games CONCURRENTLY (bounded) instead of one-at-a-time. Cap at 6
    // games in flight so we parallelize for speed without hammering MLB into
    // rate-limiting us.
    const playable = games.filter((g) => g.state !== "Final");
    const perGame = await mapWithConcurrency(playable, 6, async (g) => {
      try {
        return await buildContextsForGame(g, date, batterCast, pitcherCast, pitcherFG);
      } catch (err) {
        // One bad game shouldn't break the whole slate.
        log.warn("game build failed", { gameId: g.gameId, err: String(err) });
        return [];
      }
    });
    const contexts = perGame.flat();

    const scored = scoreAndRank(contexts);
    // Re-attach teamId — not part of the Score shape but needed by the parlay builder.
    const teamById = new Map(contexts.map((c) => [c.playerId, c.teamId]));
    return scored.map<DailyScoredPlayer>((s) => ({
      ...s,
      teamId: teamById.get(s.playerId)!,
    }));
  });
}

async function buildContextsForGame(
  g: ScheduledGame,
  date: string,
  batterCast: Awaited<ReturnType<typeof savant.getBatterStatcastSeason>>,
  pitcherCast: Awaited<ReturnType<typeof savant.getPitcherStatcastSeason>>,
  pitcherFG: Awaited<ReturnType<typeof fangraphs.getPitcherAdvancedSeason>>,
): Promise<Array<PlayerGameContext & { teamId: TeamId }>> {
  const park = parks.getParkFactors(g.venueId);
  const w = await weather.getBallparkWeather(park, g.gameDate);
  const lineups = await mlb.getLineups(g.gameId);

  const out: Array<PlayerGameContext & { teamId: TeamId }> = [];
  // Build each side: home bats vs away's pitcher, and vice-versa.
  const sides = [
    { lineup: lineups.home, teamId: g.homeTeamId, oppTeamId: g.awayTeamId, isHome: true,
      probablePitcherId: g.awayProbablePitcherId },
    { lineup: lineups.away, teamId: g.awayTeamId, oppTeamId: g.homeTeamId, isHome: false,
      probablePitcherId: g.homeProbablePitcherId },
  ];

  // Process both sides concurrently; within a side, fetch batter splits with
  // bounded concurrency so a 9-man lineup doesn't run as 9 serial calls.
  const perSide = await Promise.all(sides.map(async (s) => {
    // Slots: use confirmed lineup if present, else project from a recent game.
    let slots = s.lineup.confirmed ? s.lineup.slots : [];
    let projected = false;
    if (slots.length === 0) {
      slots = await mlb.getProjectedSlots(s.teamId as unknown as number, date);
      projected = true;
    }
    if (slots.length === 0) return [];   // no confirmed AND no projection → skip

    // Opposing pitcher: prefer the confirmed-boxscore starter, else the
    // scheduled probable pitcher (available for future games).
    const oppPitcherId =
      (s.lineup.confirmed ? s.lineup.opposingPitcherId : undefined) ?? s.probablePitcherId;
    if (!oppPitcherId) return [];        // no pitcher info at all → can't score matchup

    const oppPitcherIdNum = oppPitcherId as unknown as number;
    const pAdv = pitcherFG.get(oppPitcherIdNum) ?? blankPitcherAdvanced(oppPitcherIdNum);
    const pCast = pitcherCast.get(oppPitcherIdNum) ?? blankPitcherStatcast(oppPitcherIdNum);
    const oppHand = (s.lineup.confirmed ? s.lineup.opposingPitcherHand : undefined) ?? "R";
    const oppName = (s.lineup.confirmed ? s.lineup.opposingPitcherName : undefined) ?? "";

    // Only batters with Statcast data are scorable.
    const scorable = slots.filter((slot) => batterCast.has(slot.playerId));
    const ctxs = await mapWithConcurrency(scorable, 8, async (slot) => {
      const bCast = batterCast.get(slot.playerId)!;
      const splits = await mlb.getBattingSplits(slot.playerId, date);
      const ctx: PlayerGameContext & { teamId: TeamId } = {
        playerId: slot.playerId,
        fullName: slot.fullName,
        teamId: s.teamId,
        opponentTeamId: s.oppTeamId,
        position: slot.positionAbbr,
        gameId: g.gameId,
        isHome: s.isHome,
        battingOrder: slot.battingOrder,
        batSide: slot.batSide,
        projected,

        splits,
        statcastBatter: bCast,

        opposingPitcherId: oppPitcherId,
        opposingPitcherName: oppName,
        opposingPitcherHand: oppHand,
        pitcherAdvanced: pAdv,
        pitcherStatcast: pCast,

        park,
        weather: w,
      };
      return ctx;
    });
    return ctxs;
  }));

  out.push(...perSide.flat());
  return out;
}

function blankPitcherAdvanced(playerId: number) {
  // Neutral-league fallback so a missing FG row doesn't crash the slate.
  return {
    playerId: playerId as unknown as PlayerGameContext["pitcherAdvanced"]["playerId"],
    ip: 0, hr9: 1.3, fip: 4.0, xFip: 4.2,
  };
}
function blankPitcherStatcast(playerId: number) {
  return {
    playerId: playerId as unknown as PlayerGameContext["pitcherStatcast"]["playerId"],
    pa: 0, ip: 0, hr: 0,
    barrelRateAllowed: 0.07, hardHitRateAllowed: 0.38,
    exitVeloAllowedMph: 88, xSlgAllowed: 0.400, xwObaAllowed: 0.320,
  };
}
