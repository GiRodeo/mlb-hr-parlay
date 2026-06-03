// Storage factory. Chooses Postgres when POSTGRES_URL is set, else the
// in-memory store. Memoizes the promise (same race-safe pattern as the cache)
// so concurrent first-callers share one backend instance.

import { hasPostgres } from "@/lib/utils/env";
import { log } from "@/lib/utils/logger";
import { MemoryHistoryStore } from "./memory";
import type { HistoryStore } from "./types";

let _storePromise: Promise<HistoryStore> | null = null;

async function makeStore(): Promise<HistoryStore> {
  if (!hasPostgres) {
    log.info("history store: in-memory (no POSTGRES_URL — non-durable)");
    return new MemoryHistoryStore();
  }
  try {
    const mod = await import("@vercel/postgres").catch(() => null);
    if (!mod?.sql) {
      log.warn("POSTGRES_URL set but `@vercel/postgres` not installed; using memory store");
      return new MemoryHistoryStore();
    }
    const { PostgresHistoryStore } = await import("./postgres");
    log.info("history store: Postgres");
    // @vercel/postgres reads POSTGRES_URL from env automatically.
    return new PostgresHistoryStore(mod.sql as never);
  } catch (err) {
    log.error("failed to init Postgres; falling back to memory store", { err: String(err) });
    return new MemoryHistoryStore();
  }
}

export function historyStore(): Promise<HistoryStore> {
  if (!_storePromise) _storePromise = makeStore();
  return _storePromise;
}

export type { HistoryStore } from "./types";
