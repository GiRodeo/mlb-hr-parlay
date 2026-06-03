// Odds math — the foundation of the value layer. All functions are pure.
//
// Vocabulary:
//   - American odds: +450 / -120 (US sportsbook convention)
//   - Decimal odds:  5.50 / 1.83 (total return per 1 staked, incl. stake)
//   - Implied prob:  what the odds say the chance is (INCLUDES the book's vig)
//   - De-vigged prob: the book's "true" estimate with the margin removed
//   - EV: expected value per 1 unit staked, using OUR model's probability
//   - Edge: how much our probability exceeds the de-vigged market probability
//
// Why de-vig matters: a book never offers fair odds — they bake in a margin
// ("vig"/"juice"). The raw implied prob of a single side overstates the true
// chance. To judge whether WE have an edge, we compare our model prob to the
// margin-removed market prob, not the raw one.

// ─── Conversions ────────────────────────────────────────────────────

export function americanToDecimal(american: number): number {
  return american > 0 ? american / 100 + 1 : 100 / Math.abs(american) + 1;
}

export function decimalToAmerican(decimal: number): number {
  if (decimal <= 1) return 0;
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1));
}

/** Raw implied probability from American odds (still includes vig). 0–1. */
export function americanToImpliedProb(american: number): number {
  return american > 0 ? 100 / (american + 100) : Math.abs(american) / (Math.abs(american) + 100);
}

export function decimalToImpliedProb(decimal: number): number {
  return decimal > 0 ? 1 / decimal : 0;
}

// ─── De-vigging ─────────────────────────────────────────────────────
//
// A HR prop is a two-way market: "to hit a HR" (Yes) vs "not" (No). The two
// implied probabilities sum to >1; the excess is the vig. We remove it by
// normalizing (the standard "multiplicative"/proportional method).

/**
 * De-vig a two-way market given both sides' American odds. Returns the fair
 * probability of the YES side. If only one side is known, see
 * `devigSingleSideApprox`.
 */
export function devigTwoWay(yesAmerican: number, noAmerican: number): number {
  const yes = americanToImpliedProb(yesAmerican);
  const no = americanToImpliedProb(noAmerican);
  const overround = yes + no;
  return overround > 0 ? yes / overround : yes;
}

/**
 * Approximate de-vig when we only have the YES side (common for HR props —
 * books often surface only "to hit a HR"). We assume a typical book margin
 * and scale the implied prob down by it. `margin` is the total overround
 * (e.g. 0.06 = 6% juice across both sides); HR props commonly run 8–15%.
 */
export function devigSingleSideApprox(yesAmerican: number, margin = 0.10): number {
  const raw = americanToImpliedProb(yesAmerican);
  // Distribute the overround proportionally: fair ≈ raw / (1 + margin).
  return raw / (1 + margin);
}

// ─── Expected value & edge ──────────────────────────────────────────

/**
 * Expected value per 1 unit staked, using OUR model probability against the
 * offered (raw) American odds. Positive = +EV (a bet worth making).
 *   EV = p*(decimal-1) - (1-p)
 */
export function expectedValue(modelProb: number, american: number): number {
  const dec = americanToDecimal(american);
  const profitIfWin = dec - 1;
  return modelProb * profitIfWin - (1 - modelProb);
}

/** EV expressed as a percentage of stake (e.g. 0.08 → +8%). Same as expectedValue. */
export function evPercent(modelProb: number, american: number): number {
  return expectedValue(modelProb, american);
}

/**
 * Our edge over the market: model probability minus the de-vigged market
 * probability. Positive = we think it's more likely than the fair line.
 */
export function edge(modelProb: number, devigProb: number): number {
  return modelProb - devigProb;
}

/** Round-trip helper kept here so callers have one odds home. */
export const formatAmerican = (a: number) => (a > 0 ? `+${a}` : `${a}`);
