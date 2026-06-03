// Scoring weights. These MUST sum to 1.0. Tuned by hand initially; replace
// with weights learned from a backtest harness (see scripts/backtest.ts —
// not yet built).
//
// Rationale for current allocation:
//  - power + expected together (~38%) capture the batter's ability to hit HRs.
//  - pitcherVuln (15%) is the largest single matchup signal.
//  - park (10%) and weather (8%) are environmental amplifiers.
//  - recentForm + streak (15%) are trend signals; weighted moderately to
//    avoid chasing noise.
//  - platoon (8%) and lineup (6%) are smaller but consistently meaningful.

import type { ScoringWeights } from "@/types";

export const DEFAULT_WEIGHTS: ScoringWeights = {
  recentForm: 0.10,
  power: 0.20,
  expected: 0.18,
  pitcherVuln: 0.15,
  park: 0.10,
  platoon: 0.08,
  weather: 0.08,
  lineup: 0.06,
  streak: 0.05,
};

// Sanity check at startup. Throws if weights drift from 1.0.
const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(sum - 1) > 1e-6) {
  throw new Error(`DEFAULT_WEIGHTS must sum to 1.0; got ${sum}`);
}
