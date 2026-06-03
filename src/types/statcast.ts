// Statcast / Baseball Savant fields. Savant exposes a CSV search endpoint;
// the column names are stable. We model only what feeds the scoring engine.

import type { PlayerId } from "./common";

// Raw row of the Savant statcast_search CSV (subset).
export interface SavantRawBatterRow {
  player_id: string;
  player_name: string;
  pa: string;
  ab: string;
  hr: string;
  barrel_batted_rate: string;     // % as plain number, e.g. "12.4"
  hard_hit_percent: string;
  exit_velocity_avg: string;
  launch_angle_avg: string;
  xslg: string;
  xwoba: string;
  sweet_spot_percent: string;
}

export interface SavantRawPitcherRow {
  player_id: string;
  player_name: string;
  pa: string;
  ip: string;
  hr: string;
  barrel_batted_rate: string;     // barrels allowed
  hard_hit_percent: string;
  exit_velocity_avg: string;
  launch_angle_avg: string;
  xslg: string;
  xwoba: string;
}

// Normalized.
export interface BatterStatcast {
  playerId: PlayerId;
  pa: number;
  hr: number;
  barrelRate: number;          // 0–1
  hardHitRate: number;         // 0–1
  exitVeloAvgMph: number;
  launchAngleAvgDeg: number;
  xSlg: number;
  xwOba: number;
  sweetSpotRate: number;       // 0–1
}

export interface PitcherStatcast {
  playerId: PlayerId;
  pa: number;
  ip: number;
  hr: number;
  barrelRateAllowed: number;   // 0–1
  hardHitRateAllowed: number;  // 0–1
  exitVeloAllowedMph: number;
  xSlgAllowed: number;
  xwObaAllowed: number;
}
