// Calibration / reliability types. Calibration answers the question that
// makes every downstream EV number trustworthy or worthless: "when the model
// predicted a 12% HR chance, did ~12% of those players actually homer?"

export interface CalibrationBin {
  // Probability bucket, e.g. [0.10, 0.15).
  lower: number;
  upper: number;
  midpoint: number;          // bucket center (the "predicted" axis)
  predictedRate: number;     // mean predicted prob of samples in the bin
  observedRate: number;      // fraction that actually homered (the "actual" axis)
  count: number;             // sample size in this bin
}

export interface CalibrationSummary {
  bins: CalibrationBin[];
  totalSamples: number;
  // Expected Calibration Error: avg |predicted - observed| weighted by count.
  // Lower is better; 0 = perfectly calibrated.
  ece: number;
  // Brier score: mean squared error of probabilistic predictions (0=perfect).
  brier: number;
  // True when based on seeded/sample data rather than accumulated live history.
  isSampleData: boolean;
}
