// Persistence types for the parlay history / tracker. A recommended parlay
// is stored when it's generated, then "settled" (hit/miss) after games end.

export type ParlayOutcome = "hit" | "miss" | "pending";

// One stored, trackable parlay. Flattened for easy table rendering and so the
// storage layer doesn't need to join across tables.
export interface StoredParlay {
  id: string;                  // stable id (date + legCount + player ids hash)
  date: string;                // YYYY-MM-DD the parlay was recommended for
  legCount: 2 | 3 | 4;
  playerIds: number[];
  playersLabel: string;        // "Judge + Ohtani + Soto" for display
  confidence: number;          // 0–100 at time of recommendation
  combinedOdds: number;        // American
  combinedProbability: number;
  outcome: ParlayOutcome;
  // Per-leg settle detail; null until settled.
  legResults: Array<{ playerId: number; fullName: string; hitHr: boolean | null }>;
  createdAt: string;           // ISO
  settledAt: string | null;    // ISO when outcome was determined
}

// Aggregate stats shown on the history page header.
export interface HistorySummary {
  trackedCount: number;
  settledCount: number;
  wins: number;
  winRatePct: number;
  roiPct: number;              // per unit staked, fair-odds basis
  avgWinnerConfidence: number;
}

export interface HistoryResponse {
  parlays: StoredParlay[];
  summary: HistorySummary;
}

// Filters accepted by /api/history (all optional).
export interface HistoryFilters {
  legCount?: 2 | 3 | 4;
  minConfidence?: number;
  sinceDate?: string;          // YYYY-MM-DD inclusive
}
