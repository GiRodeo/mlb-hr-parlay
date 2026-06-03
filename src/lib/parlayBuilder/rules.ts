// Parlay construction rules. Centralized so a future config UI can expose
// these without rewriting the builder.

export const RULES = {
  // Top-N pool the builder considers when generating combinations. Higher
  // = more variety but exponentially more candidate parlays. Capped to keep
  // 4-leg generation under ~10ms.
  CANDIDATE_POOL_SIZE: 25,

  // Minimum composite score to be eligible for any parlay.
  MIN_COMPOSITE: 55,

  // Same-game stacking: at most this many legs from one game. Two HRs in
  // one game are positively correlated (good day for the offense), but more
  // than that gets thin and concentrates risk.
  MAX_LEGS_PER_GAME: 1,

  // Same-team: never stack teammates. Dingers from the same lineup are
  // strongly correlated, which sportsbooks already price into team-stack
  // markets — we focus on across-game diversification.
  MAX_LEGS_PER_TEAM: 1,

  // Number of parlays to return per leg-count bucket.
  RESULTS_PER_BUCKET: 5,

  // Diversity penalty: when two candidate parlays share K legs, the lower-
  // ranked one is dropped if it's within DIVERSITY_TOLERANCE of the higher.
  DIVERSITY_OVERLAP_THRESHOLD: 1,    // share ≥ this many legs → penalize
  DIVERSITY_TOLERANCE: 1.5,          // confidence delta below which we drop
};
