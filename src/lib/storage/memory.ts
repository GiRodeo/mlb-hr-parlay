// In-memory history store for local dev (and as a graceful fallback when no
// database is configured). NOT durable across restarts or across serverless
// invocations — it exists so the history page renders something real-shaped
// without requiring a database. Seeded with a few settled parlays.
//
// In production you MUST configure Postgres (see postgres.ts) or the page
// will appear empty/reset on every cold start.

import type { HistoryStore } from "./types";
import type { HistoryFilters, StoredParlay } from "@/types";

export class MemoryHistoryStore implements HistoryStore {
  private rows = new Map<string, StoredParlay>();

  constructor(seed: StoredParlay[] = SEED) {
    for (const p of seed) this.rows.set(p.id, p);
  }

  async save(parlay: StoredParlay): Promise<void> {
    this.rows.set(parlay.id, parlay);
  }
  async saveMany(parlays: StoredParlay[]): Promise<void> {
    for (const p of parlays) this.rows.set(p.id, p);
  }
  async list(filters?: HistoryFilters): Promise<StoredParlay[]> {
    let out = Array.from(this.rows.values());
    if (filters?.legCount) out = out.filter((p) => p.legCount === filters.legCount);
    if (filters?.minConfidence != null) out = out.filter((p) => p.confidence >= filters.minConfidence!);
    if (filters?.sinceDate) out = out.filter((p) => p.date >= filters.sinceDate!);
    // Newest first by date, then createdAt.
    return out.sort((a, b) => (b.date.localeCompare(a.date)) || b.createdAt.localeCompare(a.createdAt));
  }
  async get(id: string): Promise<StoredParlay | undefined> {
    return this.rows.get(id);
  }
  async pendingThrough(date: string): Promise<StoredParlay[]> {
    return Array.from(this.rows.values()).filter((p) => p.outcome === "pending" && p.date <= date);
  }
  async settle(id: string, update: Pick<StoredParlay, "outcome" | "legResults" | "settledAt">): Promise<void> {
    const row = this.rows.get(id);
    if (row) this.rows.set(id, { ...row, ...update });
  }
}

// A believable seed so the history page is populated in dev. Generated
// deterministically (no Date.now / Math.random) so SSR/CSR renders match and
// the list is stable across reloads. Produces 24 settled/pending parlays
// spanning ~12 days.

interface SeedPlayer { id: number; name: string }
const ROSTER: SeedPlayer[] = [
  { id: 592450, name: "Aaron Judge" },
  { id: 660271, name: "Shohei Ohtani" },
  { id: 665742, name: "Juan Soto" },
  { id: 547180, name: "Bryce Harper" },
  { id: 605141, name: "Mookie Betts" },
  { id: 624413, name: "Pete Alonso" },
  { id: 518692, name: "Freddie Freeman" },
  { id: 670541, name: "Yordan Alvarez" },
  { id: 677594, name: "Kyle Schwarber" },
  { id: 666969, name: "Adolis García" },
  { id: 596019, name: "Francisco Lindor" },
  { id: 663656, name: "Teoscar Hernández" },
];

const lastName = (full: string) => full.split(" ").slice(-1)[0]!;

// Deterministic "wiggle" so generated values look varied without randomness.
function wiggle(seed: number, span: number, offset = 0): number {
  // Combine two trig terms for a non-repeating-looking pattern.
  const v = (Math.sin(seed * 1.7) + Math.cos(seed * 0.9 + 1)) / 2; // ~[-1,1]
  return offset + ((v + 1) / 2) * span; // [offset, offset+span]
}

function buildSeed(): StoredParlay[] {
  const out: StoredParlay[] = [];
  const TODAY = "2026-06-02";
  // 24 parlays across 12 dates (2 per date), newest first.
  for (let i = 0; i < 24; i++) {
    const dayOffset = Math.floor(i / 2);           // 0..11
    const day = 2 - dayOffset;                     // June 2 down to ~May 22
    const month = day >= 1 ? 6 : 5;
    const dom = day >= 1 ? day : 31 + day;         // wrap into May
    const date = `2026-${String(month).padStart(2, "0")}-${String(dom).padStart(2, "0")}`;

    // Vary leg count 2/3/4 in a repeating pattern.
    const legCount = (2 + (i % 3)) as 2 | 3 | 4;

    // Pick legCount players starting at a rotating offset.
    const start = (i * 2) % ROSTER.length;
    const players: SeedPlayer[] = [];
    for (let k = 0; k < legCount; k++) players.push(ROSTER[(start + k) % ROSTER.length]!);

    // Confidence trends down as legs increase; varied by wiggle.
    const confidence = Math.round(wiggle(i + 3, 22, 78 - legCount * 6)); // ~58–88
    // Odds roughly consistent with the hit rates below so the ROI summary
    // reads believably (a real book prices these near break-even, slightly
    // bettor-negative): 2-leg ~+260, 3-leg ~+480, 4-leg ~+780.
    const baseOdds = legCount === 2 ? 260 : legCount === 3 ? 480 : 780;
    const combinedOdds = Math.round(baseOdds + wiggle(i + 5, 140));
    // Implied probability from the (de-vigged) odds, for display consistency.
    const combinedProbability = Number((100 / (combinedOdds + 100)).toFixed(4));

    // Today's parlays are still pending; older ones are settled.
    const isToday = date === TODAY;
    // Deterministic hit/miss. HR parlays hit rarely in reality — more legs,
    // far less likely. We gate on a low deterministic threshold so the win
    // rate / ROI summary reads believably (roughly: 2-leg ~30%, 4-leg ~12%).
    const hitThreshold = legCount === 2 ? 30 : legCount === 3 ? 18 : 12;
    const hit = !isToday && wiggle(i + 7, 100) < hitThreshold;
    const outcome = isToday ? "pending" : hit ? "hit" : "miss";

    // Per-leg results: for a hit, all legs homered; for a miss, at least one didn't.
    const legResults = players.map((p, idx) => ({
      playerId: p.id,
      fullName: p.name,
      hitHr: isToday ? null : hit ? true : idx !== 0, // miss → first leg failed
    }));

    out.push({
      id: `${date}-${legCount}leg-${players.map((p) => p.id).join("-")}`,
      date,
      legCount,
      playerIds: players.map((p) => p.id),
      playersLabel: players.map((p) => lastName(p.name)).join(" + "),
      confidence,
      combinedOdds,
      combinedProbability,
      outcome,
      legResults,
      createdAt: `${date}T15:00:00.000Z`,
      settledAt: isToday ? null : `${date}T23:30:00.000Z`,
    });
  }
  return out;
}

const SEED: StoredParlay[] = buildSeed();

// Exported so the Postgres store can seed an empty table with the same demo
// data, keeping dev (memory) and prod (Postgres) consistent on first run.
export const HISTORY_SEED: StoredParlay[] = SEED;
