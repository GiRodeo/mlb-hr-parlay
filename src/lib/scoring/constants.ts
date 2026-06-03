// Shared scoring constants. Centralized so calibration, trend, and feature
// scorers reference the same league baselines.

// League-average HR per plate appearance (rough MLB-wide; ~0.034). Used as
// the flat reference line on the trend chart.
export const LEAGUE_AVG_HR_PER_PA = 0.034;

// League-average HR per game per batter (~0.06). Anchors the composite→
// probability calibration. See calibrate.ts.
export const LEAGUE_AVG_HR_PER_GAME = 0.06;

// League-average reference values for StatBar comparisons on the profile.
// Percentages are whole numbers to match Score.display fields.
export const LEAGUE_AVG = {
  barrelRate: 8.5,
  exitVelo: 89.0,
  launchAngle: 12.5,
  xSlg: 0.415,
  hardHit: 38.5,
  hrRateSeason: 0.14,
} as const;
