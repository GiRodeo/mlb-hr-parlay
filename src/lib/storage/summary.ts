// Compute the aggregate history summary (win rate, ROI, etc.) from a set of
// stored parlays. Pure — easy to unit test.

import type { HistorySummary, StoredParlay } from "@/types";

// American odds → profit on a 1-unit stake.
function profitPerUnit(americanOdds: number): number {
  return americanOdds > 0 ? americanOdds / 100 : 100 / Math.abs(americanOdds);
}

export function computeSummary(parlays: StoredParlay[]): HistorySummary {
  const settled = parlays.filter((p) => p.outcome !== "pending");
  const wins = settled.filter((p) => p.outcome === "hit");

  const winRatePct = settled.length ? (wins.length / settled.length) * 100 : 0;

  // ROI: stake 1 unit on each settled parlay; winners pay fair odds.
  let pnl = 0;
  for (const p of settled) {
    pnl += p.outcome === "hit" ? profitPerUnit(p.combinedOdds) : -1;
  }
  const roiPct = settled.length ? (pnl / settled.length) * 100 : 0;

  const avgWinnerConfidence = wins.length
    ? wins.reduce((s, p) => s + p.confidence, 0) / wins.length
    : 0;

  return {
    trackedCount: parlays.length,
    settledCount: settled.length,
    wins: wins.length,
    winRatePct: Number(winRatePct.toFixed(1)),
    roiPct: Number(roiPct.toFixed(1)),
    avgWinnerConfidence: Number(avgWinnerConfidence.toFixed(1)),
  };
}
