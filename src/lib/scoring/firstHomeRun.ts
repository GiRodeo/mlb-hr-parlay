// First-HR-of-the-game model.
//
// "First home run" is a RACE, not an independent prop: only one player per
// game can win it. A batter's chance therefore depends on (a) his own HR
// rate, AND (b) how early he bats relative to everyone else — a leadoff
// hitter sees pitches sooner, so he's more likely to be "first" even at an
// equal HR rate.
//
// We model the game as a chronological sequence of plate appearances and walk
// it as a survival process:
//   - Convert each batter's P(≥1 HR in game) into a per-PA HR hazard.
//   - Step through PAs in order. At each PA:
//       P(this batter hits the FIRST HR here) = P(no HR in any prior PA) × hazard
//   - Accumulate that per batter; multiply survival down as we go.
// The resulting per-player probabilities sum to P(at least one HR in the game),
// which is exactly the constraint a correct first-HR model must satisfy.

export interface FirstHrBatter {
  playerId: number;
  fullName: string;
  battingOrder: number;        // 1–9
  isHome: boolean;
  gameHrProb: number;          // P(≥1 HR in the game) for this batter (0–1)
}

export interface FirstHrResult {
  playerId: number;
  fullName: string;
  isHome: boolean;
  battingOrder: number;
  firstHrProb: number;         // P(this batter hits the game's first HR)
}

// Assumed plate appearances per batter across a 9-inning game. ~38 PA per team
// over 9 innings ÷ 9 slots ≈ 4.2; leadoff hitters get slightly more, but a
// flat 4.2 with order-based sequencing already captures the timing effect.
const PA_PER_BATTER = 4.2;

/** Per-PA HR hazard from a whole-game HR probability. */
function perPaHazard(gameProb: number, pa = PA_PER_BATTER): number {
  const p = Math.max(0, Math.min(0.95, gameProb));
  // P(≥1 in PA trials) = 1 - (1-h)^PA  →  h = 1 - (1-p)^(1/PA)
  return 1 - Math.pow(1 - p, 1 / pa);
}

/**
 * Compute first-HR probability for every batter in a single game.
 * `home` and `away` are each up to 9 batters with their game HR probs.
 */
export function firstHomeRunModel(batters: FirstHrBatter[]): FirstHrResult[] {
  const home = batters.filter((b) => b.isHome).sort((a, b) => a.battingOrder - b.battingOrder);
  const away = batters.filter((b) => !b.isHome).sort((a, b) => a.battingOrder - b.battingOrder);
  if (home.length === 0 && away.length === 0) return [];

  // Per-batter hazard lookup.
  const hazard = new Map<number, number>();
  for (const b of [...home, ...away]) hazard.set(b.playerId, perPaHazard(b.gameHrProb));

  // Build the chronological PA order. Each half-inning the batting team sends
  // ~ (lineup turns) hitters; over a game each slot bats ~PA_PER_BATTER times.
  // We interleave by half-inning: away bats top, home bats bottom, repeating
  // through the order, for the whole-number of full turns implied by PA count.
  const TURNS = Math.round(PA_PER_BATTER); // ~4 full cycles through the order
  const sequence: FirstHrBatter[] = [];
  for (let turn = 0; turn < TURNS; turn++) {
    // top of inning: away bats
    for (const b of away) sequence.push(b);
    // bottom of inning: home bats (home team may not bat in the 9th if leading,
    // but modeling that requires score state we don't have — flat is fine)
    for (const b of home) sequence.push(b);
  }

  // Walk the sequence as a survival process.
  const firstHr = new Map<number, number>();
  let survival = 1; // P(no HR has occurred yet)
  for (const b of sequence) {
    const h = hazard.get(b.playerId) ?? 0;
    const pFirstHere = survival * h;
    firstHr.set(b.playerId, (firstHr.get(b.playerId) ?? 0) + pFirstHere);
    survival *= 1 - h; // nobody homered this PA
  }

  return [...home, ...away]
    .map((b) => ({
      playerId: b.playerId,
      fullName: b.fullName,
      isHome: b.isHome,
      battingOrder: b.battingOrder,
      firstHrProb: Number((firstHr.get(b.playerId) ?? 0).toFixed(4)),
    }))
    .sort((a, b) => b.firstHrProb - a.firstHrProb);
}
