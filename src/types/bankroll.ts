// Bankroll & staking tracker types. A "bet" is a single wager the user logged
// (single HR prop or a parlay), with stake, odds, and an outcome. The bankroll
// curve and summary are derived from the ordered sequence of settled bets.

export type BetResult = "won" | "lost" | "push" | "pending";

export interface BetRecord {
  id: string;
  date: string;             // YYYY-MM-DD the bet was placed for
  label: string;            // e.g. "Aaron Judge HR" or "Judge + Ohtani (2-leg)"
  americanOdds: number;     // the price taken
  stakeUnits: number;       // units risked
  result: BetResult;
  // Realized profit in units once settled (win = stake×payout, loss = −stake,
  // push = 0). Null while pending.
  profitUnits: number | null;
  createdAt: string;        // ISO
  settledAt: string | null; // ISO when result was set
  note?: string;
}

// One point on the bankroll-over-time curve (after each settled bet).
export interface BankrollPoint {
  index: number;            // 1-based settled-bet sequence number
  date: string;
  label: string;
  bankroll: number;         // running bankroll in units after this bet
  profitUnits: number;      // this bet's profit (signed)
}

export interface BankrollSummary {
  startingBankroll: number; // units the curve starts from
  currentBankroll: number;  // after all settled bets
  totalStaked: number;      // sum of settled stakes
  netProfitUnits: number;   // currentBankroll - startingBankroll
  roiPct: number;           // netProfit / totalStaked
  betsSettled: number;
  betsPending: number;
  wins: number;
  losses: number;
  winRatePct: number;
  maxDrawdownPct: number;   // largest peak-to-trough drop in bankroll
  curve: BankrollPoint[];
}

export interface BankrollResponse {
  bets: BetRecord[];        // newest first
  summary: BankrollSummary;
}

// Payload to log a new bet.
export interface NewBetInput {
  date: string;
  label: string;
  americanOdds: number;
  stakeUnits: number;
  result?: BetResult;       // defaults to "pending"
  note?: string;
}
