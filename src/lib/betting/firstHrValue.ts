// First-HR value builder: groups today's scored players by game, runs the
// first-HR survival model per game, then (if odds are configured) joins live
// batter_first_home_run prices and computes EV/edge.

import { firstHomeRunModel, type FirstHrBatter } from "@/lib/scoring/firstHomeRun";
import { getFirstHrOddsByName, hasOddsApi } from "@/lib/services/oddsApi";
import { expectedValue, edge as edgeFn } from "./odds";
import type { DailyScoredPlayer } from "@/lib/scoring/orchestrate";
import type { FirstHrPick, FirstHrResponse } from "@/types";

export async function buildFirstHrPicks(
  date: string,
  scored: DailyScoredPlayer[],
  generatedAtIso: string,
): Promise<FirstHrResponse> {
  // Group players by game.
  const byGame = new Map<number, DailyScoredPlayer[]>();
  for (const s of scored) {
    const gid = s.gameId as unknown as number;
    const arr = byGame.get(gid) ?? [];
    arr.push(s);
    byGame.set(gid, arr);
  }

  // Run the survival model per game, collecting per-player first-HR probs.
  const firstProbByPlayer = new Map<number, number>();
  for (const [, players] of byGame) {
    const batters: FirstHrBatter[] = players.map((p) => ({
      playerId: p.playerId as unknown as number,
      fullName: p.fullName,
      battingOrder: p.display.battingOrder,
      isHome: p.display.isHome,
      gameHrProb: p.impliedHrProbability,
    }));
    for (const r of firstHomeRunModel(batters)) {
      firstProbByPlayer.set(r.playerId, r.firstHrProb);
    }
  }

  // Optional live odds for batter_first_home_run.
  const oddsByName = hasOddsApi ? await getFirstHrOddsByName(date) : new Map();

  const picks: FirstHrPick[] = scored.map((s) => {
    const pid = s.playerId as unknown as number;
    const firstHrProb = firstProbByPlayer.get(pid) ?? 0;
    const pick: FirstHrPick = {
      playerId: s.playerId,
      fullName: s.fullName,
      teamAbbr: s.display.teamAbbr,
      matchup: s.display.matchup,
      battingOrder: s.display.battingOrder,
      firstHrProb,
    };

    const odds = oddsByName.get(s.fullName.toLowerCase());
    if (odds) {
      const ev = expectedValue(firstHrProb, odds.bestAmerican);
      pick.bestAmerican = odds.bestAmerican;
      pick.bestBook = odds.bestBook;
      pick.marketProb = odds.marketProb;
      pick.edge = edgeFn(firstHrProb, odds.marketProb);
      pick.evPercent = ev;
      pick.positiveEv = ev > 0;
    }
    return pick;
  });

  // Sort by model probability (the picks exist with or without odds).
  picks.sort((a, b) => b.firstHrProb - a.firstHrProb);

  const oddsAvailable = picks.some((p) => p.bestAmerican !== undefined);
  return { date, generatedAt: generatedAtIso, oddsAvailable, picks };
}
