// Types for the value/odds layer.

import type { PlayerId } from "./common";

// A single book's "to hit a home run" price for a player.
export interface BookHrOdds {
  playerId: PlayerId;
  playerName: string;
  bookmaker: string;        // "draftkings", "fanduel", …
  yesAmerican: number;      // odds to hit ≥1 HR
  noAmerican?: number;      // odds NOT to (when the book posts both sides)
}

// Best available price for a player across all books, plus where it's from.
export interface BestHrOdds {
  playerId: PlayerId;
  playerName: string;
  bestBook: string;
  bestAmerican: number;
  // de-vigged "fair" market probability (two-way if available, else approx)
  marketProb: number;
  // every book's price, for the line-shopping view
  allBooks: Array<{ bookmaker: string; american: number }>;
}

// The value verdict for one player: our model vs the market.
export interface ValuePick {
  playerId: PlayerId;
  fullName: string;
  teamAbbr: string;
  matchup: string;
  composite: number;
  modelProb: number;        // our model's HR probability (0–1)
  marketProb: number;       // de-vigged market probability (0–1)
  bestAmerican: number;     // best price available
  bestBook: string;
  edge: number;             // modelProb - marketProb
  evPercent: number;        // expected value per unit staked
  kellyUnits: number;       // suggested stake (quarter-Kelly, capped)
  positiveEv: boolean;
}

export interface ValueResponse {
  date: string;
  generatedAt: string;
  // False when no live odds feed (ODDS_API_KEY) is configured — the UI shows a
  // "connect an odds feed" state instead of picks. We never fabricate odds.
  oddsConfigured: boolean;
  picks: ValuePick[];       // sorted by EV desc
}
