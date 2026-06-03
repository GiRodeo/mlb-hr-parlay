// Parlay output shape returned by /api/parlays.

import type { GameId, PlayerId } from "./common";

export interface ParlayLeg {
  playerId: PlayerId;
  fullName: string;
  gameId: GameId;
  composite: number;           // from Score
  impliedHrProbability: number;
  // Display fields carried from the player's Score.display so ParlayCard
  // renders without a second lookup.
  teamAbbr: string;
  matchup: string;             // "vs BOS" / "@ COL"
  americanOdds: number;        // fair odds from impliedHrProbability
}

export interface Parlay {
  legs: ParlayLeg[];                 // length 2, 3, or 4
  // Naive multiplicative joint probability (assumes independence; we
  // partially correct for same-game / same-team correlations in the builder).
  combinedProbability: number;
  // Fair American odds derived from combinedProbability (no vig).
  combinedOdds: number;
  // Average composite — handy as a summary number.
  avgComposite: number;
  // 0–100 confidence rating used to sort within a leg-count bucket.
  // Combines probability, score variance, and correlation penalty.
  confidence: number;
  rationale: string;                 // short human-readable summary
}

export interface DailyParlayBundle {
  date: string;                      // YYYY-MM-DD
  generatedAt: string;               // ISO datetime
  // True when the slate is built from PROJECTED lineups (e.g. looking ahead
  // to a future date before official lineups post). UI shows a banner.
  projected: boolean;
  twoLeg: Parlay[];
  threeLeg: Parlay[];
  fourLeg: Parlay[];
}
