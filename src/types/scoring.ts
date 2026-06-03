// Inputs and outputs of the scoring engine. Each Subscore is 0–100 so we
// can compose with simple weighted average and report contribution clearly.

import type { GameId, Handedness, PitcherHandedness, PlayerId, TeamId } from "./common";
import type { BatterStatcast, PitcherStatcast } from "./statcast";
import type { BattingSplit } from "./mlb";
import type { PitcherAdvanced } from "./fangraphs";
import type { ParkFactors } from "./park";
import type { BallparkWeather } from "./weather";

export interface PlayerGameContext {
  playerId: PlayerId;
  fullName: string;
  teamId: TeamId;
  opponentTeamId: TeamId;      // the other club in this game (for matchup display)
  position: string;            // "RF", "DH", … (from the lineup slot)
  gameId: GameId;
  isHome: boolean;
  battingOrder: number;
  batSide: Handedness;
  projected: boolean;                    // lineup projected vs officially confirmed

  splits: BattingSplit[];                // 7d, 14d, 30d, season
  statcastBatter: BatterStatcast;

  opposingPitcherId: PlayerId;
  opposingPitcherName: string;
  opposingPitcherHand: PitcherHandedness;
  pitcherAdvanced: PitcherAdvanced;
  pitcherStatcast: PitcherStatcast;

  park: ParkFactors;
  weather: BallparkWeather;
}

// Each feature is normalized to 0–100. This makes weighting and explanations
// uniform regardless of the underlying unit (mph vs %, etc.).
export interface FeatureSubscores {
  recentForm: number;          // rolling HR rate vs season baseline (z-score → 0–100)
  power: number;               // statcast barrel + EV + LA composite
  expected: number;            // xSLG, xwOBA composite
  pitcherVuln: number;         // HR/9, xFIP, barrel% allowed
  park: number;                // park HR index w/ handedness split
  platoon: number;             // L/R, R/L bonus; switch hitters near neutral
  weather: number;             // wind out, temp, humidity
  lineup: number;              // batting order slot (1–5 favored)
  streak: number;              // hot/cold z-score boost
}

// A single point on the rolling HR-rate trend (drives the profile chart).
export interface TrendPoint {
  game: number;        // 1 = most recent
  hrRate: number;      // rolling HR/PA (or per-game) at that point
  leagueAvg: number;   // flat reference line
}

// Display-oriented fields the UI renders but the pure scoring math doesn't
// need. Kept in a sub-object so the scoring core (composite/subscores) stays
// uncluttered, while the API can return everything a card needs in one shape.
// Populated by the orchestrator from the same PlayerGameContext that was
// scored — so there's a single source of truth, no second fetch.
export interface ScoreDisplay {
  teamAbbr: string;
  teamName: string;
  position: string;            // "RF", "DH", …
  batSide: Handedness;
  battingOrder: number;        // 1–9 lineup slot
  isHome: boolean;
  // True when this player's lineup slot is PROJECTED (from a recent game)
  // rather than an officially confirmed lineup — e.g. looking ahead to a
  // future date before lineups are posted.
  projected: boolean;
  opponentName: string;        // opposing team display name
  matchup: string;             // "vs BOS" / "@ COL" — precomputed for cards

  // headline batter Statcast (percentages as whole numbers, e.g. 22.4)
  barrelRate: number;
  exitVelo: number;
  launchAngle: number;
  hardHit: number;
  xSlg: number;

  // HR rate by rolling window (per the BattingSplit windows)
  hrRate: { d7: number; d14: number; d30: number; season: number };

  // opposing pitcher snapshot
  opposingPitcher: {
    name: string;
    hand: PitcherHandedness;
    hr9: number;
    xFip: number;
    barrelPctAllowed: number;  // whole number, e.g. 10.8
  };

  // ballpark
  venueName: string;
  parkHrIndex: number;

  // Optional 30-game trend. Omitted from slate listings (large); populated
  // only by the single-player endpoint to keep the daily payload small.
  trend?: TrendPoint[];
}

export interface Score {
  playerId: PlayerId;
  fullName: string;
  gameId: GameId;
  composite: number;           // 0–100
  subscores: FeatureSubscores;
  // Per-feature contribution to the composite (subscore * weight).
  // Sum equals `composite`. Drives the "why" tooltip in UI.
  contributions: FeatureSubscores;
  // Convert composite to an implied HR probability for parlay math.
  // Calibrated separately; see lib/scoring/calibrate.ts.
  impliedHrProbability: number;   // 0–1
  // Everything the UI needs to render a card without a second lookup.
  display: ScoreDisplay;
}

// Weights sum to 1.0. Tuned empirically; see scoring/weights.ts.
export interface ScoringWeights extends FeatureSubscores {}
