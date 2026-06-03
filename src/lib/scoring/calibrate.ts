// Convert composite score (0–100) into an implied per-game HR probability.
//
// Assumption: the composite is roughly monotonic with HR likelihood. We map
// it through a logistic so the relationship at the tails is reasonable
// (a top-tier matchup ~0.18, a bottom-tier batter ~0.02). The MLB-wide
// per-batter per-game HR rate is roughly ~0.06 — that's our anchor at
// composite=50.
//
// Replace this with a fitted curve once we have backtest data.

import { LEAGUE_AVG_HR_PER_GAME } from "./constants";

// Steepness picked so composite=20 → ~0.025 and composite=80 → ~0.16.
const K = 0.07;

/** Composite (0–100) → implied probability (0–1). */
export function compositeToHrProbability(composite: number): number {
  // Center the logistic at 50 with our chosen slope.
  const x = K * (composite - 50);
  const logistic = 1 / (1 + Math.exp(-x));
  // Anchor: at composite=50, logistic=0.5; we scale so output equals
  // LEAGUE_AVG_HR_PER_GAME at that midpoint.
  return logistic * (LEAGUE_AVG_HR_PER_GAME * 2);
}
