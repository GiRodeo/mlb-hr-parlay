// Derive the bankroll curve + summary stats from a set of logged bets. Pure
// and dependency-free, so it's easy to test and reuse on client or server.

import { americanToDecimal } from "@/lib/betting/odds";
import type { BankrollPoint, BankrollSummary, BetRecord } from "@/types";

const STARTING_BANKROLL = 100; // units; the curve's baseline

/** Realized profit (units) for a settled bet. win = stake×(dec-1), loss = -stake. */
export function realizedProfit(bet: BetRecord): number {
  if (bet.result === "won") return bet.stakeUnits * (americanToDecimal(bet.americanOdds) - 1);
  if (bet.result === "lost") return -bet.stakeUnits;
  return 0; // push / pending → no realized P&L
}

export function computeBankroll(bets: BetRecord[], starting = STARTING_BANKROLL): BankrollSummary {
  // Settled bets in chronological order build the curve.
  const settled = bets
    .filter((b) => b.result === "won" || b.result === "lost" || b.result === "push")
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  const curve: BankrollPoint[] = [];
  let bankroll = starting;
  let peak = starting;
  let maxDrawdown = 0;
  let totalStaked = 0;
  let wins = 0;
  let losses = 0;

  settled.forEach((b, i) => {
    const profit = b.profitUnits ?? realizedProfit(b);
    bankroll += profit;
    totalStaked += b.stakeUnits;
    if (b.result === "won") wins++;
    else if (b.result === "lost") losses++;

    peak = Math.max(peak, bankroll);
    const dd = peak > 0 ? (peak - bankroll) / peak : 0;
    maxDrawdown = Math.max(maxDrawdown, dd);

    curve.push({
      index: i + 1,
      date: b.date,
      label: b.label,
      bankroll: Number(bankroll.toFixed(2)),
      profitUnits: Number(profit.toFixed(2)),
    });
  });

  const netProfit = bankroll - starting;
  const decided = wins + losses;

  return {
    startingBankroll: starting,
    currentBankroll: Number(bankroll.toFixed(2)),
    totalStaked: Number(totalStaked.toFixed(2)),
    netProfitUnits: Number(netProfit.toFixed(2)),
    roiPct: totalStaked > 0 ? Number(((netProfit / totalStaked) * 100).toFixed(1)) : 0,
    betsSettled: settled.length,
    betsPending: bets.filter((b) => b.result === "pending").length,
    wins,
    losses,
    winRatePct: decided > 0 ? Number(((wins / decided) * 100).toFixed(1)) : 0,
    maxDrawdownPct: Number((maxDrawdown * 100).toFixed(1)),
    curve,
  };
}
