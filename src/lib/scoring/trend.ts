// Build the 30-game rolling HR-rate trend for the player profile chart.
// Uses a trailing window so a single multi-HR game doesn't spike the line.

import { mlb } from "@/lib/services";
import { LEAGUE_AVG_HR_PER_PA } from "@/lib/scoring/constants";
import type { TrendPoint } from "@/types";

const WINDOW = 30;          // games shown
const ROLLING = 7;          // trailing games averaged per point

/**
 * Returns up to 30 points, most-recent game last (so the chart reads left→
 * right as oldest→newest, matching `game` ascending). Each point is the
 * trailing-7-game HR/PA rate ending at that game.
 */
export async function buildTrend(playerId: number, date: string): Promise<TrendPoint[]> {
  const season = Number(date.slice(0, 10).slice(0, 4));
  const log = await mlb.getGameLog(playerId, season); // most-recent-first
  if (log.length === 0) return [];

  // Take the last 30 games and put them oldest-first for charting.
  const recent = log.slice(0, WINDOW).reverse();

  const points: TrendPoint[] = recent.map((_, i) => {
    // Trailing window ending at game i (inclusive).
    const start = Math.max(0, i - (ROLLING - 1));
    const slice = recent.slice(start, i + 1);
    const pa = slice.reduce((s, g) => s + g.plateAppearances, 0);
    const hr = slice.reduce((s, g) => s + g.homeRuns, 0);
    return {
      game: i + 1,
      hrRate: pa > 0 ? Number((hr / pa).toFixed(3)) : 0,
      leagueAvg: LEAGUE_AVG_HR_PER_PA,
    };
  });
  return points;
}
