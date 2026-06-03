// Storage backend contract for parlay history. Mirrors the pluggable pattern
// used by lib/cache: an interface with an in-memory dev impl and a Postgres
// prod impl, chosen at runtime from env.

import type { HistoryFilters, StoredParlay } from "@/types";

export interface HistoryStore {
  /** Persist (or upsert by id) a recommended parlay. */
  save(parlay: StoredParlay): Promise<void>;
  /** Bulk save — used when a day's bundle is recorded at once. */
  saveMany(parlays: StoredParlay[]): Promise<void>;
  /** List parlays, newest first, optionally filtered. */
  list(filters?: HistoryFilters): Promise<StoredParlay[]>;
  /** Fetch one by id (or undefined). */
  get(id: string): Promise<StoredParlay | undefined>;
  /** All still-pending parlays for games on/before `date` — the settle job's input. */
  pendingThrough(date: string): Promise<StoredParlay[]>;
  /** Update outcome + per-leg results after games conclude. */
  settle(id: string, update: Pick<StoredParlay, "outcome" | "legResults" | "settledAt">): Promise<void>;
}
