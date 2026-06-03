// GET /api/calibration → model reliability curve + ECE/Brier.
//
// HONESTY NOTE: real calibration needs a log of individual (predictedProb,
// didHomer) pairs accumulated across many slates — the backtest harness that
// is still stubbed. We deliberately do NOT derive it from parlay history:
// every leg in a parlay shares one parlay-level confidence, which is a poor
// per-player proxy and yields misleading numbers. Until a proper prediction
// log exists, we serve a SEEDED sample (designed to look like realistic, mild
// model overconfidence) flagged via `isSampleData: true`. When the backtest
// harness lands, swap `sampleCalibrationData()` for the logged samples.

import { computeCalibration, sampleCalibrationData } from "@/lib/scoring/calibration";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    // Always sample data for now — see honesty note above.
    return Response.json(computeCalibration(sampleCalibrationData(), undefined, true));
  } catch (err) {
    log.error("calibration route failed", { err: String(err) });
    return Response.json({ error: "Failed to build calibration" }, { status: 500 });
  }
}
