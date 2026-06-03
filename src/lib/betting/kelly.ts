// Kelly criterion staking. Sizes a bet by the size of your edge instead of
// betting flat — the discipline that separates disciplined bettors from
// square flat-bettors.
//
// Full Kelly maximizes long-run growth but is famously volatile (and assumes
// your probability estimate is exact, which it never is). Practitioners use a
// FRACTION of Kelly — quarter-Kelly is the common default — to cut variance
// and protect against model error. We default to 0.25 and clamp the result so
// a single bet can never exceed a sane share of bankroll.

import { americanToDecimal } from "./odds";

export interface KellyResult {
  fullKellyFraction: number;   // raw Kelly fraction of bankroll (0–1)
  stakeFraction: number;       // after applying `fraction`, clamped
  units: number;               // stakeFraction * unitBankroll (display units)
  positive: boolean;           // true only when the bet has positive edge
}

export interface KellyOptions {
  fraction?: number;           // fraction of full Kelly (default 0.25)
  maxStakeFraction?: number;   // hard cap per bet (default 0.05 = 5% bankroll)
  unitBankroll?: number;       // bankroll expressed in units (default 100)
}

/**
 * Kelly stake for a single bet.
 *   f* = (b*p - q) / b
 * where b = decimal odds - 1 (profit per unit), p = win prob, q = 1 - p.
 *
 * A non-positive f* means no edge → stake 0 (never bet into a negative edge).
 */
export function kellyStake(
  modelProb: number,
  american: number,
  opts: KellyOptions = {},
): KellyResult {
  const fraction = opts.fraction ?? 0.25;
  const maxStake = opts.maxStakeFraction ?? 0.05;
  const unitBankroll = opts.unitBankroll ?? 100;

  const b = americanToDecimal(american) - 1; // net profit per unit staked
  const p = Math.max(0, Math.min(1, modelProb));
  const q = 1 - p;

  const fullKelly = b > 0 ? (b * p - q) / b : 0;

  if (fullKelly <= 0) {
    return { fullKellyFraction: Math.max(0, fullKelly), stakeFraction: 0, units: 0, positive: false };
  }

  const staked = Math.min(fullKelly * fraction, maxStake);
  return {
    fullKellyFraction: fullKelly,
    stakeFraction: staked,
    units: Number((staked * unitBankroll).toFixed(2)),
    positive: true,
  };
}
