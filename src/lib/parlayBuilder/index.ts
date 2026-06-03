// Parlay builder. Given today's scored players (with team metadata),
// returns the top 2/3/4-leg parlays.
//
// Approach:
//   1. Filter to eligible players (composite ≥ threshold).
//   2. Take a top-N pool.
//   3. Enumerate combinations satisfying construction rules.
//   4. Score each combo by joint probability + average composite,
//      with a small penalty for same-game correlation.
//   5. Diversify across the bucket so we don't return five near-identical
//      parlays that all share the same MVP candidate.

import { combinations } from "./combinations";
import { RULES } from "./rules";
import { probabilityToAmericanOdds } from "@/lib/utils/confidence";
import type { DailyParlayBundle, GameId, Parlay, ParlayLeg, Score, TeamId } from "@/types";

// Score is the per-player ranking object; we need a small annotation per
// player for game/team to enforce same-game/team rules. Builders accept
// this enriched record to keep the type contract explicit.
export interface ScoredCandidate extends Score {
  teamId: TeamId;
  gameId: GameId;       // already on Score; restated for clarity
}

export interface BuildOptions {
  date: string;                                 // YYYY-MM-DD
  generatedAtIso?: string;                      // ISO datetime for the bundle
}

export function buildDailyParlays(
  candidates: ScoredCandidate[],
  opts: BuildOptions,
): DailyParlayBundle {
  // 1. Filter + 2. Pool.
  const eligible = candidates
    .filter((c) => c.composite >= RULES.MIN_COMPOSITE)
    .sort((a, b) => b.composite - a.composite)
    .slice(0, RULES.CANDIDATE_POOL_SIZE);

  // Slate is "projected" if most of the eligible pool came from projected
  // lineups (i.e. looking ahead before official lineups posted).
  const projectedCount = eligible.filter((c) => c.display.projected).length;
  const projected = eligible.length > 0 && projectedCount >= eligible.length / 2;

  return {
    date: opts.date,
    generatedAt: opts.generatedAtIso ?? new Date(0).toISOString().replace(/.+/, "1970-01-01T00:00:00.000Z"),
    projected,
    twoLeg: buildBucket(eligible, 2),
    threeLeg: buildBucket(eligible, 3),
    fourLeg: buildBucket(eligible, 4),
  };
}

function buildBucket(pool: ScoredCandidate[], k: number): Parlay[] {
  const all: Parlay[] = [];
  for (const combo of combinations(pool, k)) {
    if (!passesRules(combo)) continue;
    all.push(scoreParlay(combo));
  }
  // Sort by confidence desc; then diversify so the top-N aren't redundant.
  all.sort((a, b) => b.confidence - a.confidence);
  return diversify(all, RULES.RESULTS_PER_BUCKET);
}

function passesRules(combo: ScoredCandidate[]): boolean {
  const games = new Map<number, number>();
  const teams = new Map<number, number>();
  for (const c of combo) {
    games.set(c.gameId, (games.get(c.gameId) ?? 0) + 1);
    teams.set(c.teamId, (teams.get(c.teamId) ?? 0) + 1);
  }
  for (const v of games.values()) if (v > RULES.MAX_LEGS_PER_GAME) return false;
  for (const v of teams.values()) if (v > RULES.MAX_LEGS_PER_TEAM) return false;
  return true;
}

function scoreParlay(combo: ScoredCandidate[]): Parlay {
  const legs: ParlayLeg[] = combo.map((c) => ({
    playerId: c.playerId,
    fullName: c.fullName,
    gameId: c.gameId,
    composite: c.composite,
    impliedHrProbability: c.impliedHrProbability,
    // Display fields carried from the player's Score.display.
    teamAbbr: c.display.teamAbbr,
    matchup: c.display.matchup,
    americanOdds: probabilityToAmericanOdds(c.impliedHrProbability),
  }));

  // Naive joint probability assumes independence. With our same-game cap
  // (1 leg/game) this is a fair first approximation; relax the cap and we
  // would need a proper correlation matrix.
  const combinedProbability = legs.reduce((p, l) => p * l.impliedHrProbability, 1);

  const avgComposite = legs.reduce((s, l) => s + l.composite, 0) / legs.length;

  // Confidence blends three signals:
  //   - log-prob (rewards parlays that are actually likely to hit)
  //   - avg composite (rewards quality of inputs)
  //   - variance penalty (rewards balance — discourage one elite + one mediocre)
  const composites = legs.map((l) => l.composite);
  const m = composites.reduce((a, b) => a + b, 0) / composites.length;
  const variance = composites.reduce((s, x) => s + (x - m) ** 2, 0) / composites.length;
  const stddev = Math.sqrt(variance);

  // Map log-prob into a 0–100ish band. log(0.001) ≈ -6.9; log(0.04) ≈ -3.2.
  // Scale so that small parlays end up in the same range as 4-leggers.
  const logProb = Math.log(Math.max(combinedProbability, 1e-6));
  const probScore = Math.max(0, 100 + logProb * 8); // tuned roughly

  const confidence = Math.max(
    0,
    avgComposite * 0.55 + probScore * 0.45 - stddev * 0.4,
  );

  return {
    legs,
    combinedProbability,
    combinedOdds: probabilityToAmericanOdds(combinedProbability),
    avgComposite,
    confidence,
    rationale: rationale(legs, avgComposite),
  };
}

function rationale(legs: ParlayLeg[], avg: number): string {
  const names = legs.map((l) => l.fullName.split(" ").slice(-1)[0]).join(" + ");
  return `${legs.length}-leg: ${names}. Avg composite ${avg.toFixed(1)}.`;
}

// ─── Diversity filter ───────────────────────────────────────────────
// Keep parlays that overlap with already-selected ones only if they bring
// enough additional confidence. This prevents the bucket from being five
// permutations of the same top 4 players.
function diversify(sorted: Parlay[], n: number): Parlay[] {
  const out: Parlay[] = [];
  for (const p of sorted) {
    if (out.length === 0) { out.push(p); if (out.length >= n) break; continue; }
    const tooSimilar = out.some((kept) => {
      const overlap = countOverlap(kept.legs, p.legs);
      return overlap >= RULES.DIVERSITY_OVERLAP_THRESHOLD &&
             kept.confidence - p.confidence < RULES.DIVERSITY_TOLERANCE;
    });
    if (!tooSimilar) {
      out.push(p);
      if (out.length >= n) break;
    }
  }
  return out;
}

function countOverlap(a: ParlayLeg[], b: ParlayLeg[]): number {
  const ids = new Set(a.map((l) => l.playerId));
  let n = 0;
  for (const l of b) if (ids.has(l.playerId)) n++;
  return n;
}
