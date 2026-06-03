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

// A small, believable seed so the history page isn't empty in dev. Dates are
// static (no Date.now) to keep dev renders deterministic.
const SEED: StoredParlay[] = [
  {
    id: "2026-06-01-2-aaa", date: "2026-06-01", legCount: 2,
    playerIds: [592450, 660271], playersLabel: "Judge + Ohtani",
    confidence: 81, combinedOdds: 2900, combinedProbability: 0.031, outcome: "hit",
    legResults: [
      { playerId: 592450, fullName: "Aaron Judge", hitHr: true },
      { playerId: 660271, fullName: "Shohei Ohtani", hitHr: true },
    ],
    createdAt: "2026-06-01T15:00:00.000Z", settledAt: "2026-06-02T04:00:00.000Z",
  },
  {
    id: "2026-06-01-3-bbb", date: "2026-06-01", legCount: 3,
    playerIds: [592450, 665742, 547180], playersLabel: "Judge + Soto + Harper",
    confidence: 70, combinedOdds: 14200, combinedProbability: 0.0072, outcome: "miss",
    legResults: [
      { playerId: 592450, fullName: "Aaron Judge", hitHr: true },
      { playerId: 665742, fullName: "Juan Soto", hitHr: false },
      { playerId: 547180, fullName: "Bryce Harper", hitHr: false },
    ],
    createdAt: "2026-06-01T15:00:00.000Z", settledAt: "2026-06-02T04:00:00.000Z",
  },
  {
    id: "2026-05-31-2-ccc", date: "2026-05-31", legCount: 2,
    playerIds: [624413, 605141], playersLabel: "Alonso + Betts",
    confidence: 66, combinedOdds: 4100, combinedProbability: 0.024, outcome: "hit",
    legResults: [
      { playerId: 624413, fullName: "Pete Alonso", hitHr: true },
      { playerId: 605141, fullName: "Mookie Betts", hitHr: true },
    ],
    createdAt: "2026-05-31T15:00:00.000Z", settledAt: "2026-06-01T04:00:00.000Z",
  },
  {
    id: "2026-06-02-2-ddd", date: "2026-06-02", legCount: 2,
    playerIds: [592450, 660271], playersLabel: "Judge + Ohtani",
    confidence: 82, combinedOdds: 2950, combinedProbability: 0.031, outcome: "pending",
    legResults: [
      { playerId: 592450, fullName: "Aaron Judge", hitHr: null },
      { playerId: 660271, fullName: "Shohei Ohtani", hitHr: null },
    ],
    createdAt: "2026-06-02T15:00:00.000Z", settledAt: null,
  },
];
