// Value layer: join today's scored players with market odds, then compute
// the betting verdict for each — EV, edge, and a Kelly stake. This is the
// piece that turns "who's likely to homer" into "which bets are worth making".

import { getLiveHrOddsByName, hasOddsApi } from "@/lib/services/oddsApi";
import { expectedValue, edge as edgeFn } from "./odds";
import { kellyStake } from "./kelly";
import type { DailyScoredPlayer } from "@/lib/scoring/orchestrate";
import type { BestHrOdds, ValuePick, ValueResponse } from "@/types";

export async function buildValuePicks(
  date: string,
  scored: DailyScoredPlayer[],
  generatedAtIso: string,
): Promise<ValueResponse> {
  // Live odds only. If no odds API key is configured, there is no market to
  // value against — we return an empty set and flag it so the UI explains why
  // (rather than inventing fake odds).
  const oddsConfigured = hasOddsApi;
  const oddsByPlayerId = new Map<number, BestHrOdds>();

  if (oddsConfigured) {
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
      // Sort books best→worst price for the line-shopping display.
      allBooks: [...odds.allBooks].sort((a, b) => b.american - a.american),
      edge: edgeFn(modelProb, odds.marketProb),
      evPercent: ev,
      kellyUnits: kelly.units,
      positiveEv: ev > 0,
    });
  }

  // Sort by EV descending — the best bets first.
  picks.sort((a, b) => b.evPercent - a.evPercent);

  return { date, generatedAt: generatedAtIso, oddsConfigured, picks };
}
