// MLB Stats API service. The API itself is undocumented but stable enough
// for our purposes. We expose only normalized shapes — the raw response
// types in @/types/mlb stay internal to this file.

import { httpFetch } from "@/lib/http/fetcher";
import { withCache } from "@/lib/cache";
import { env } from "@/lib/utils/env";
import { parseRate } from "@/lib/utils/math";
import { log } from "@/lib/utils/logger";
import {
  asGameId, asPlayerId, asTeamId, asVenueId,
  type ConfirmedLineup, type LineupSlot, type ScheduledGame,
  type MlbBoxscoreResponse, type MlbPlayerStatsResponse, type MlbScheduleResponse,
  type BattingSplit, type Handedness, type PitcherHandedness,
} from "@/types";

// ─── Schedule ───────────────────────────────────────────────────────

/** All games scheduled for a given YYYY-MM-DD. */
export async function getSchedule(date: string): Promise<ScheduledGame[]> {
  const key = `mlb:schedule:${date}`;
  return withCache(key, env.CACHE_TTL_SCHEDULE_S, async () => {
    const url = `${env.MLB_STATS_API_BASE}/schedule?sportId=1&date=${date}&hydrate=probablePitcher,venue`;
    const raw = await httpFetch<MlbScheduleResponse>(url);
    const games = raw.dates.flatMap((d) => d.games);
    log.info("mlb schedule", { date, count: games.length });
    return games.map<ScheduledGame>((g) => ({
      gameId: asGameId(g.gamePk),
      gameDate: g.gameDate,
      state: g.status.abstractGameState,
      homeTeamId: asTeamId(g.teams.home.team.id),
      awayTeamId: asTeamId(g.teams.away.team.id),
      homeTeamName: g.teams.home.team.name,
      awayTeamName: g.teams.away.team.name,
      venueId: asVenueId(g.venue.id),
      venueName: g.venue.name,
      homeProbablePitcherId: g.teams.home.probablePitcher
        ? asPlayerId(g.teams.home.probablePitcher.id) : undefined,
      awayProbablePitcherId: g.teams.away.probablePitcher
        ? asPlayerId(g.teams.away.probablePitcher.id) : undefined,
    }));
  });
}

// ─── Lineups ────────────────────────────────────────────────────────

/**
 * Confirmed lineups for a game. If `battingOrder` is missing on the boxscore
 * the lineup hasn't been posted yet; we mark `confirmed: false` and the
 * caller may decide to fall back to a projected lineup or skip the game.
 */
export async function getLineups(gameId: number): Promise<{ home: ConfirmedLineup; away: ConfirmedLineup }> {
  const key = `mlb:lineup:${gameId}`;
  return withCache(key, env.CACHE_TTL_LINEUPS_S, async () => {
    const url = `${env.MLB_STATS_API_BASE.replace("/v1", "/v1.1")}/game/${gameId}/feed/live`;
    // We hit the live feed because /boxscore omits batting order until first pitch.
    type LiveFeed = { liveData: { boxscore: MlbBoxscoreResponse } };
    const raw = await httpFetch<LiveFeed>(url);
    const box = raw.liveData.boxscore;
    return {
      home: parseLineup(box, "home", asGameId(gameId)),
      away: parseLineup(box, "away", asGameId(gameId)),
    };
  });
}

function parseLineup(
  box: MlbBoxscoreResponse,
  side: "home" | "away",
  gameId: ReturnType<typeof asGameId>,
): ConfirmedLineup {
  const team = box.teams[side];
  const order = team.battingOrder ?? [];
  const slots: LineupSlot[] = order.map((idStr, idx) => {
    const p = team.players[`ID${idStr}`];
    const batSide = (p?.batSide?.code ?? "R") as Handedness;
    return {
      playerId: asPlayerId(Number(idStr)),
      fullName: p?.person.fullName ?? `Unknown #${idStr}`,
      battingOrder: idx + 1,
      positionAbbr: p?.position.abbreviation ?? "",
      batSide,
    };
  });
  // Find the opposing starter (position P) on the *other* side's roster.
  const otherSide = side === "home" ? "away" : "home";
  const otherTeam = box.teams[otherSide];
  const opposingPitcher = Object.values(otherTeam.players).find(
    (pl) => pl.position.abbreviation === "P" && pl.pitchHand,
  );
  return {
    gameId,
    teamId: asTeamId(team.team.id),
    isHome: side === "home",
    slots,
    confirmed: order.length === 9,
    opposingPitcherId: opposingPitcher ? asPlayerId(opposingPitcher.person.id) : undefined,
    opposingPitcherName: opposingPitcher?.person.fullName,
    opposingPitcherHand: opposingPitcher?.pitchHand?.code as PitcherHandedness | undefined,
  };
}

// ─── Player batting splits (rolling windows) ────────────────────────

/**
 * Returns BattingSplit rows for the requested rolling windows plus full season.
 * `windowDays` is informational — MLB Stats API computes the totals from
 * `byDateRange` with explicit startDate/endDate.
 */
export async function getBattingSplits(
  playerId: number,
  asOfDate: string,
  windows: number[] = [7, 14, 30],
): Promise<BattingSplit[]> {
  const key = `mlb:splits:${playerId}:${asOfDate}:${windows.join(",")}`;
  return withCache(key, env.CACHE_TTL_LINEUPS_S, async () => {
    const out: BattingSplit[] = [];
    for (const w of windows) {
      const start = shiftDate(asOfDate, -w);
      const url = `${env.MLB_STATS_API_BASE}/people/${playerId}/stats?stats=byDateRange&group=hitting&startDate=${start}&endDate=${asOfDate}`;
      const raw = await httpFetch<MlbPlayerStatsResponse>(url);
      const split = raw.stats[0]?.splits[0]?.stat;
      out.push(toBattingSplit(split, w));
    }
    // Season total
    const seasonUrl = `${env.MLB_STATS_API_BASE}/people/${playerId}/stats?stats=season&group=hitting`;
    const seasonRaw = await httpFetch<MlbPlayerStatsResponse>(seasonUrl);
    const seasonStat = seasonRaw.stats[0]?.splits[0]?.stat;
    out.push(toBattingSplit(seasonStat, "season"));
    return out;
  });
}

function toBattingSplit(s: MlbPlayerStatsResponse["stats"][number]["splits"][number]["stat"] | undefined, window: number | "season"): BattingSplit {
  const pa = Number(s?.plateAppearances ?? 0);
  const ab = Number(s?.atBats ?? 0);
  const hr = Number(s?.homeRuns ?? 0);
  return {
    windowDays: window,
    plateAppearances: pa,
    atBats: ab,
    homeRuns: hr,
    homeRunRatePerPA: pa > 0 ? hr / pa : 0,
    slg: parseRate(s?.slg),
    ops: parseRate(s?.ops),
  };
}

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

// ─── Who homered on a date (for settling parlays) ──────────────────

/**
 * Returns the set of player IDs who hit at least one HR in any game on
 * `date`. Reads each final game's boxscore and sums batting.homeRuns.
 */
export async function getHomeRunHitters(date: string): Promise<Set<number>> {
  const key = `mlb:hrhitters:${date}`;
  // Cache as an array — JSON can't serialize a Set — then rehydrate.
  const ids = await withCache(key, env.CACHE_TTL_STATCAST_S, async () => {
    const games = await getSchedule(date);
    const hitters = new Set<number>();
    for (const g of games) {
      if (g.state !== "Final") continue;
      const url = `${env.MLB_STATS_API_BASE}/game/${g.gameId}/boxscore`;
      try {
        const box = await httpFetch<MlbBoxscoreResponse>(url);
        for (const side of [box.teams.home, box.teams.away]) {
          for (const p of Object.values(side.players)) {
            const hr = Number((p.stats?.batting as { homeRuns?: number } | undefined)?.homeRuns ?? 0);
            if (hr > 0) hitters.add(p.person.id);
          }
        }
      } catch {
        // Skip a game whose boxscore fails; better partial settle than none.
      }
    }
    return Array.from(hitters);
  });
  return new Set(ids);
}

// ─── Game log (per-game HR/PA, for the profile trend chart) ─────────

export interface GameLogEntry {
  date: string;        // YYYY-MM-DD
  plateAppearances: number;
  homeRuns: number;
}

/** Most-recent-first game-by-game hitting log for the season-to-date. */
export async function getGameLog(playerId: number, season: number): Promise<GameLogEntry[]> {
  const key = `mlb:gamelog:${playerId}:${season}`;
  return withCache(key, env.CACHE_TTL_STATCAST_S, async () => {
    const url = `${env.MLB_STATS_API_BASE}/people/${playerId}/stats?stats=gameLog&group=hitting&season=${season}`;
    const raw = await httpFetch<MlbPlayerStatsResponse>(url);
    const splits = raw.stats[0]?.splits ?? [];
    const log: GameLogEntry[] = splits.map((sp) => ({
      // gameLog splits carry a `date` field alongside `stat`.
      date: (sp as { date?: string }).date ?? "",
      plateAppearances: Number(sp.stat.plateAppearances ?? 0),
      homeRuns: Number(sp.stat.homeRuns ?? 0),
    }));
    // API returns oldest-first; reverse to most-recent-first.
    return log.reverse();
  });
}
