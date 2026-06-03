// Postgres-backed history store using @vercel/postgres. Used in production
// when POSTGRES_URL is set (Vercel's Postgres / Neon integration injects it).
//
// The client is imported dynamically so the dependency stays out of the
// bundle when running on the in-memory store. Schema is created on first use
// (idempotent) so there's no separate migration step for this single table —
// fine for one table; graduate to a real migration tool if the schema grows.

import type { HistoryStore } from "./types";
import type { HistoryFilters, StoredParlay } from "@/types";
import { log } from "@/lib/utils/logger";
import { HISTORY_SEED } from "./memory";

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

export class PostgresHistoryStore implements HistoryStore {
  private ready: Promise<void> | null = null;
  constructor(private sql: Sql) {}

  // Lazily ensure the table exists AND is seeded, exactly once. Seeding only
  // happens when the table is empty — so the demo Hit/Miss history appears on
  // a fresh Postgres database (matching the in-memory store), but real data is
  // never overwritten on subsequent runs.
  private ensure(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.sql`
          CREATE TABLE IF NOT EXISTS parlay_history (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            leg_count INT NOT NULL,
            player_ids JSONB NOT NULL,
            players_label TEXT NOT NULL,
            confidence REAL NOT NULL,
            combined_odds INT NOT NULL,
            combined_probability REAL NOT NULL,
            outcome TEXT NOT NULL,
            leg_results JSONB NOT NULL,
            created_at TEXT NOT NULL,
            settled_at TEXT
          )
        `;
        const { rows } = await this.sql`SELECT COUNT(*)::int AS n FROM parlay_history`;
        const count = Number(rows[0]?.n ?? 0);
        if (count === 0) {
          log.info("seeding empty parlay_history table", { rows: HISTORY_SEED.length });
          for (const p of HISTORY_SEED) await this.insert(p);
        }
      })();
    }
    return this.ready;
  }

  async save(p: StoredParlay): Promise<void> {
    await this.ensure();
    await this.insert(p);
  }

  // Raw upsert WITHOUT ensure() — used by both save() and the seeding step
  // (seeding runs inside ensure(), so it must not call ensure() recursively).
  private async insert(p: StoredParlay): Promise<void> {
    await this.sql`
      INSERT INTO parlay_history
        (id, date, leg_count, player_ids, players_label, confidence,
         combined_odds, combined_probability, outcome, leg_results, created_at, settled_at)
      VALUES
        (${p.id}, ${p.date}, ${p.legCount}, ${JSON.stringify(p.playerIds)}, ${p.playersLabel},
         ${p.confidence}, ${p.combinedOdds}, ${p.combinedProbability}, ${p.outcome},
         ${JSON.stringify(p.legResults)}, ${p.createdAt}, ${p.settledAt})
      ON CONFLICT (id) DO UPDATE SET
        outcome = EXCLUDED.outcome,
        leg_results = EXCLUDED.leg_results,
        settled_at = EXCLUDED.settled_at
    `;
  }

  async saveMany(parlays: StoredParlay[]): Promise<void> {
    // Sequential keeps it simple; volume here is a handful per day.
    for (const p of parlays) await this.save(p);
  }

  async list(filters?: HistoryFilters): Promise<StoredParlay[]> {
    await this.ensure();
    // Build predicates conditionally. @vercel/postgres tagged template
    // parameterizes safely; we compose with a few branches rather than a
    // dynamic string to avoid injection.
    const rows = await this.selectFiltered(filters);
    return rows
      .map(rowToParlay)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  private async selectFiltered(f?: HistoryFilters) {
    if (f?.legCount && f.minConfidence != null && f.sinceDate) {
      return (await this.sql`SELECT * FROM parlay_history WHERE leg_count=${f.legCount} AND confidence>=${f.minConfidence} AND date>=${f.sinceDate}`).rows;
    }
    if (f?.legCount) {
      return (await this.sql`SELECT * FROM parlay_history WHERE leg_count=${f.legCount}`).rows;
    }
    if (f?.minConfidence != null) {
      return (await this.sql`SELECT * FROM parlay_history WHERE confidence>=${f.minConfidence}`).rows;
    }
    if (f?.sinceDate) {
      return (await this.sql`SELECT * FROM parlay_history WHERE date>=${f.sinceDate}`).rows;
    }
    return (await this.sql`SELECT * FROM parlay_history`).rows;
  }

  async get(id: string): Promise<StoredParlay | undefined> {
    await this.ensure();
    const { rows } = await this.sql`SELECT * FROM parlay_history WHERE id=${id}`;
    return rows[0] ? rowToParlay(rows[0]) : undefined;
  }

  async pendingThrough(date: string): Promise<StoredParlay[]> {
    await this.ensure();
    const { rows } = await this.sql`SELECT * FROM parlay_history WHERE outcome='pending' AND date<=${date}`;
    return rows.map(rowToParlay);
  }

  async settle(id: string, u: Pick<StoredParlay, "outcome" | "legResults" | "settledAt">): Promise<void> {
    await this.ensure();
    await this.sql`
      UPDATE parlay_history
      SET outcome=${u.outcome}, leg_results=${JSON.stringify(u.legResults)}, settled_at=${u.settledAt}
      WHERE id=${id}
    `;
    log.debug("settled parlay", { id, outcome: u.outcome });
  }
}

// Map a DB row (snake_case, JSONB) back to the domain shape.
function rowToParlay(r: Record<string, unknown>): StoredParlay {
  return {
    id: String(r.id),
    date: String(r.date),
    legCount: Number(r.leg_count) as 2 | 3 | 4,
    playerIds: asJson<number[]>(r.player_ids, []),
    playersLabel: String(r.players_label),
    confidence: Number(r.confidence),
    combinedOdds: Number(r.combined_odds),
    combinedProbability: Number(r.combined_probability),
    outcome: r.outcome as StoredParlay["outcome"],
    legResults: asJson<StoredParlay["legResults"]>(r.leg_results, []),
    createdAt: String(r.created_at),
    settledAt: r.settled_at == null ? null : String(r.settled_at),
  };
}

// JSONB columns come back already-parsed from @vercel/postgres, but tolerate
// a string (some drivers return text) to be safe.
function asJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") { try { return JSON.parse(v) as T; } catch { return fallback; } }
  return v as T;
}
