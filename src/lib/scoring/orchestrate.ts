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

    const contexts: Array<PlayerGameContext & { teamId: TeamId }> = [];
    for (const g of games) {
      if (g.state === "Final") continue;
      try {
        const ctxsForGame = await buildContextsForGame(
          g, date, batterCast, pitcherCast, pitcherFG,
        );
        contexts.push(...ctxsForGame);
      } catch (err) {
        // One bad game shouldn't break the whole slate.
        log.warn("game build failed", { gameId: g.gameId, err: String(err) });
      }
    }

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
  for (const side of [lineups.home, lineups.away]) {
    if (!side.confirmed) continue;       // skip projected lineups for now
    if (!side.opposingPitcherId) continue;

    // The opponent club is whichever side this batting team is NOT.
    const opponentTeamId = (side.isHome ? g.awayTeamId : g.homeTeamId);

    const pAdv = pitcherFG.get(side.opposingPitcherId) ?? blankPitcherAdvanced(side.opposingPitcherId);
    const pCast = pitcherCast.get(side.opposingPitcherId) ?? blankPitcherStatcast(side.opposingPitcherId);

    for (const slot of side.slots) {
      const bCast = batterCast.get(slot.playerId);
      if (!bCast) continue;              // not enough Statcast data → skip

      const splits = await mlb.getBattingSplits(slot.playerId, date);
      out.push({
        playerId: slot.playerId,
        fullName: slot.fullName,
        teamId: side.teamId,
        opponentTeamId,
        position: slot.positionAbbr,
        gameId: g.gameId,
        isHome: side.isHome,
        battingOrder: slot.battingOrder,
        batSide: slot.batSide,

        splits,
        statcastBatter: bCast,

        opposingPitcherId: side.opposingPitcherId,
        opposingPitcherName: side.opposingPitcherName ?? "",
        opposingPitcherHand: side.opposingPitcherHand ?? "R",
        pitcherAdvanced: pAdv,
        pitcherStatcast: pCast,

        park,
        weather: w,
      });
    }
  }
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
