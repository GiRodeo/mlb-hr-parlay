// Calibration engine. Bins (predictedProbability, didHomer) samples and
// computes a reliability curve + summary error metrics.
//
// IMPORTANT HONESTY NOTE: real calibration requires a large set of LOGGED
// predictions paired with actual outcomes, accumulated over many slates (the
// backtest harness that's still stubbed). Until that history exists, the API
// serves a SEEDED sample so the chart renders and the methodology is visible —
// flagged via `isSampleData: true`. Do not read the sample as the model's real
// calibration.

import type { CalibrationBin, CalibrationSummary } from "@/types";

export interface CalibrationSample {
  predicted: number; // model probability 0–1
  outcome: 0 | 1;    // 1 = homered, 0 = did not
}

const DEFAULT_EDGES = [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 1.0];

/** Bin samples into probability buckets and compute the reliability curve. */
export function computeCalibration(
  samples: CalibrationSample[],
  edges: number[] = DEFAULT_EDGES,
  isSampleData = false,
): CalibrationSummary {
  const bins: CalibrationBin[] = [];

  for (let i = 0; i < edges.length - 1; i++) {
    const lower = edges[i]!;
    const upper = edges[i + 1]!;
    const inBin = samples.filter((s) => s.predicted >= lower && s.predicted < upper);
    if (inBin.length === 0) continue;

    const predictedRate = inBin.reduce((a, s) => a + s.predicted, 0) / inBin.length;
    const observedRate = inBin.reduce((a, s) => a + s.outcome, 0) / inBin.length;
    bins.push({
      lower,
      upper,
      midpoint: (lower + upper) / 2,
      predictedRate: Number(predictedRate.toFixed(4)),
      observedRate: Number(observedRate.toFixed(4)),
      count: inBin.length,
    });
  }

  const total = samples.length;
  // ECE: count-weighted average gap between predicted and observed.
  const ece = total > 0
    ? bins.reduce((a, b) => a + (b.count / total) * Math.abs(b.predictedRate - b.observedRate), 0)
    : 0;
  // Brier: mean squared error of the probabilistic predictions.
  const brier = total > 0
    ? samples.reduce((a, s) => a + (s.predicted - s.outcome) ** 2, 0) / total
    : 0;

  return {
    bins,
    totalSamples: total,
    ece: Number(ece.toFixed(4)),
    brier: Number(brier.toFixed(4)),
    isSampleData,
  };
}

// ─── Seeded sample data ─────────────────────────────────────────────
// Deterministic (no Math.random) so the chart is stable. Designed to look
// like a slightly-overconfident model (predictions run a touch high vs.
// reality at the top end) — a realistic, honest-looking calibration, not a
// fake-perfect diagonal.

export function sampleCalibrationData(): CalibrationSample[] {
  const out: CalibrationSample[] = [];
  // For each predicted level, generate N samples whose outcome rate is the
  // "true" rate (slightly below predicted at high probs = mild overconfidence).
  const levels: Array<{ predicted: number; trueRate: number; n: number }> = [
    { predicted: 0.03, trueRate: 0.035, n: 220 },
    { predicted: 0.07, trueRate: 0.068, n: 180 },
    { predicted: 0.12, trueRate: 0.110, n: 140 },
    { predicted: 0.17, trueRate: 0.150, n: 90 },
    { predicted: 0.23, trueRate: 0.190, n: 55 },
    { predicted: 0.32, trueRate: 0.250, n: 28 },
  ];
  for (const lvl of levels) {
    const hits = Math.round(lvl.trueRate * lvl.n);
    for (let i = 0; i < lvl.n; i++) {
      out.push({ predicted: lvl.predicted, outcome: i < hits ? 1 : 0 });
    }
  }
  return out;
}
