// Helpers to turn generated parlays into StoredParlay rows, and to settle
// them against actual game results.

import type { Parlay, StoredParlay, ParlayOutcome } from "@/types";

// Deterministic id for a parlay on a given date: date + legcount + sorted
// player ids. Idempotent so re-running the record job doesn't duplicate rows.
export function parlayId(date: string, p: Parlay): string {
  const ids = p.legs.map((l) => l.playerId).sort((a, b) => a - b).join("-");
  return `${date}-${p.legs.length}leg-${ids}`;
}

export function toStored(date: string, p: Parlay, createdAtIso: string): StoredParlay {
  const label = p.legs
    .map((l) => l.fullName.split(" ").slice(-1)[0]) // last names
    .join(" + ");
  return {
    id: parlayId(date, p),
    date,
    legCount: p.legs.length as 2 | 3 | 4,
    playerIds: p.legs.map((l) => l.playerId as unknown as number),
    playersLabel: label,
    confidence: Number(p.confidence.toFixed(1)),
    combinedOdds: p.combinedOdds,
    combinedProbability: p.combinedProbability,
    outcome: "pending",
    legResults: p.legs.map((l) => ({
      playerId: l.playerId as unknown as number,
      fullName: l.fullName,
      hitHr: null,
    })),
    createdAt: createdAtIso,
    settledAt: null,
  };
}

// Given which players actually homered, derive a parlay outcome. A parlay
// hits only if every leg's player homered.
export function deriveOutcome(
  stored: StoredParlay,
  homeredPlayerIds: Set<number>,
  settledAtIso: string,
): Pick<StoredParlay, "outcome" | "legResults" | "settledAt"> {
  const legResults = stored.legResults.map((lr) => ({
    ...lr,
    hitHr: homeredPlayerIds.has(lr.playerId),
  }));
  const outcome: ParlayOutcome = legResults.every((lr) => lr.hitHr) ? "hit" : "miss";
  return { outcome, legResults, settledAt: settledAtIso };
}
