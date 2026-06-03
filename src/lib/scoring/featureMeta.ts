// Human-facing metadata for each scoring feature — labels, short
// explanations, and display order. Shared by the "why this score" breakdown
// and any legend/tooltip UI so wording stays consistent with the model.

import type { FeatureSubscores } from "@/types";

export type FeatureKey = keyof FeatureSubscores;

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  description: string;
}

// Ordered most→least heavily weighted (matches DEFAULT_WEIGHTS intent).
export const FEATURE_META: FeatureMeta[] = [
  { key: "power", label: "Power", description: "Statcast barrel rate, exit velocity & launch angle." },
  { key: "expected", label: "Expected output", description: "xSLG and xwOBA — quality of contact, luck-adjusted." },
  { key: "pitcherVuln", label: "Pitcher vulnerability", description: "Opposing starter's HR/9, xFIP & barrel% allowed." },
  { key: "recentForm", label: "Recent form", description: "Rolling 7/14/30-day HR rate vs. season baseline." },
  { key: "park", label: "Ballpark", description: "Park HR index with batter-handedness split & altitude." },
  { key: "platoon", label: "Platoon edge", description: "Batter vs. pitcher handedness matchup." },
  { key: "weather", label: "Weather", description: "Wind out to center, temperature & humidity." },
  { key: "lineup", label: "Lineup slot", description: "Batting-order position (more PAs = more chances)." },
  { key: "streak", label: "Hot/cold streak", description: "Z-score of recent HR rate vs. season norm." },
];
