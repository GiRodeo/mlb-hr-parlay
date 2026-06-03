// Value layer: join today's scored players with market odds, then compute
// the betting verdict for each — EV, edge, and a Kelly stake. This is the
// piece that turns "who's likely to homer" into "which bets are worth making".

import { getLiveHrOddsByName, buildDemoOdds, hasOddsApi } from "@/lib/services/oddsApi";
import { expectedValue, edge as edgeFn } from "./odds";
import { kellyStake } from "./kelly";
import type { DailyScoredPlayer } from "@/lib/scoring/orchestrate";
import type { BestHrOdds, ValuePick, ValueResponse } from "@/types";

export async function buildValuePicks(
  date: string,
  scored: DailyScoredPlayer[],
  generatedAtIso: string,
): Promise<ValueResponse> {
  // Resolve odds source. Live (paid) if a key is set, else the demo market.
  const usingDemoOdds = !hasOddsApi;

  let oddsByPlayerId = new Map<number, BestHrOdds>();
  if (usingDemoOdds) {
    oddsByPlayerId = buildDemoOdds(
      scored.map((s) => ({
        playerId: s.playerId as unknown as number,
        name: s.fullName,
        modelProb: s.impliedHrProbability,
      })),
    );
  } else {
    // Live odds come keyed by player NAME (the odds API has no MLB ids), so
    // we name-match into our scored players.
    const byName = await getLiveHrOddsByName(date);
    for (const s of scored) {
      const hit = byName.get(s.fullName.toLowerCase());
      if (hit) oddsByPlayerId.set(s.playerId as unknown as number, hit);
    }
  }

  const picks: ValuePick[] = [];
  for (const s of scored) {
    const pid = s.playerId as unknown as number;
    const odds = oddsByPlayerId.get(pid);
    if (!odds) continue;                 // no market for this player → skip

    const modelProb = s.impliedHrProbability;
    const ev = expectedValue(modelProb, odds.bestAmerican);
    const kelly = kellyStake(modelProb, odds.bestAmerican, { fraction: 0.25 });

    picks.push({
      playerId: s.playerId,
      fullName: s.fullName,
      teamAbbr: s.display.teamAbbr,
      matchup: s.display.matchup,
      composite: s.composite,
      modelProb,
      marketProb: odds.marketProb,
      bestAmerican: odds.bestAmerican,
      bestBook: odds.bestBook,
      edge: edgeFn(modelProb, odds.marketProb),
      evPercent: ev,
      kellyUnits: kelly.units,
      positiveEv: ev > 0,
      isDemo: odds.isDemo,
    });
  }

  // Sort by EV descending — the best bets first.
  picks.sort((a, b) => b.evPercent - a.evPercent);

  return { date, generatedAt: generatedAtIso, usingDemoOdds, picks };
}
