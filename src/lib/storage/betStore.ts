// Bet store: persistence for the bankroll tracker. Same pluggable pattern as
// the history store — an interface with a seeded in-memory dev impl and a
// Postgres prod impl, chosen at runtime from env.

import { hasPostgres } from "@/lib/utils/env";
import { log } from "@/lib/utils/logger";
import { realizedProfit } from "./bankrollSummary";
import type { BetRecord, NewBetInput } from "@/types";

export interface BetStore {
  list(): Promise<BetRecord[]>;                 // newest first
  add(bet: BetRecord): Promise<void>;
}

// ─── ID + record construction ───────────────────────────────────────

/** Build a full BetRecord from user input. `nowIso` injected for determinism. */
export function makeBet(input: NewBetInput, nowIso: string): BetRecord {
  const result = input.result ?? "pending";
  // Deterministic id from timestamp + label (no Math.random in stores).
  const id = `${input.date}-${nowIso}-${input.label}`.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  const base: BetRecord = {
    id,
    date: input.date,
    label: input.label,
    americanOdds: input.americanOdds,
    stakeUnits: input.stakeUnits,
    result,
    profitUnits: null,
    createdAt: nowIso,
    settledAt: result === "pending" ? null : nowIso,
    note: input.note,
  };
  if (result !== "pending") base.profitUnits = realizedProfit(base);
  return base;
}

// ─── In-memory (seeded) ─────────────────────────────────────────────

class MemoryBetStore implements BetStore {
  private rows: BetRecord[] = [...SEED];
  async list() {
    return [...this.rows].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  }
  async add(bet: BetRecord) { this.rows.push(bet); }
}

// ─── Postgres ───────────────────────────────────────────────────────

type Sql = (s: TemplateStringsArray, ...v: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

class PostgresBetStore implements BetStore {
  private ready: Promise<void> | null = null;
  constructor(private sql: Sql) {}
  private ensure() {
    if (!this.ready) {
      this.ready = this.sql`
        CREATE TABLE IF NOT EXISTS bets (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          label TEXT NOT NULL,
          american_odds INT NOT NULL,
          stake_units REAL NOT NULL,
          result TEXT NOT NULL,
          profit_units REAL,
          created_at TEXT NOT NULL,
          settled_at TEXT,
          note TEXT
        )`.then(() => undefined);
    }
    return this.ready;
  }
  async list() {
    await this.ensure();
    const { rows } = await this.sql`SELECT * FROM bets ORDER BY date DESC, created_at DESC`;
    return rows.map(rowToBet);
  }
  async add(b: BetRecord) {
    await this.ensure();
    await this.sql`
      INSERT INTO bets (id, date, label, american_odds, stake_units, result, profit_units, created_at, settled_at, note)
      VALUES (${b.id}, ${b.date}, ${b.label}, ${b.americanOdds}, ${b.stakeUnits}, ${b.result},
              ${b.profitUnits}, ${b.createdAt}, ${b.settledAt}, ${b.note ?? null})
      ON CONFLICT (id) DO NOTHING`;
  }
}

function rowToBet(r: Record<string, unknown>): BetRecord {
  return {
    id: String(r.id),
    date: String(r.date),
    label: String(r.label),
    americanOdds: Number(r.american_odds),
    stakeUnits: Number(r.stake_units),
    result: r.result as BetRecord["result"],
    profitUnits: r.profit_units == null ? null : Number(r.profit_units),
    createdAt: String(r.created_at),
    settledAt: r.settled_at == null ? null : String(r.settled_at),
    note: r.note == null ? undefined : String(r.note),
  };
}

// ─── Factory ────────────────────────────────────────────────────────

let _promise: Promise<BetStore> | null = null;
async function make(): Promise<BetStore> {
  if (!hasPostgres) {
    log.info("bet store: in-memory (no POSTGRES_URL — non-durable)");
    return new MemoryBetStore();
  }
  try {
    const mod = await import("@vercel/postgres").catch(() => null);
    if (!mod?.sql) return new MemoryBetStore();
    log.info("bet store: Postgres");
    return new PostgresBetStore(mod.sql as never);
  } catch (err) {
    log.error("bet store init failed; using memory", { err: String(err) });
    return new MemoryBetStore();
  }
}
export function betStore(): Promise<BetStore> {
  if (!_promise) _promise = make();
  return _promise;
}

// ─── Seed (deterministic, illustrative) ─────────────────────────────
// A believable run of settled bets so the bankroll chart renders in dev.
// Net slightly negative — honest for HR betting.
const SEED: BetRecord[] = [
  mkSeed("2026-05-28", "Aaron Judge HR", 240, 2, "won"),
  mkSeed("2026-05-28", "Pete Alonso HR", 360, 1.5, "lost"),
  mkSeed("2026-05-29", "Ohtani + Betts (2-leg)", 1100, 1, "lost"),
  mkSeed("2026-05-29", "Kyle Schwarber HR", 280, 1.5, "lost"),
  mkSeed("2026-05-30", "Yordan Alvarez HR", 300, 2, "lost"),
  mkSeed("2026-05-30", "Mookie Betts HR", 340, 1, "won"),
  mkSeed("2026-05-31", "Aaron Judge HR", 250, 2, "lost"),
  mkSeed("2026-05-31", "Teoscar Hernández HR", 310, 1.5, "lost"),
  mkSeed("2026-06-01", "Judge + Soto (2-leg)", 900, 1, "lost"),
  mkSeed("2026-06-01", "Pete Alonso HR", 330, 1.5, "lost"),
  mkSeed("2026-06-02", "Shohei Ohtani HR", 250, 2, "won"),
  mkSeed("2026-06-02", "Juan Soto HR", 330, 1.5, "lost"),
  mkSeed("2026-06-03", "Aaron Judge HR", 230, 2, "pending"),
];

function mkSeed(date: string, label: string, odds: number, stake: number, result: BetRecord["result"]): BetRecord {
  const rec: BetRecord = {
    id: `seed-${date}-${label}`.replace(/[^a-zA-Z0-9-]/g, ""),
    date, label, americanOdds: odds, stakeUnits: stake, result,
    profitUnits: null,
    createdAt: `${date}T15:00:00.000Z`,
    settledAt: result === "pending" ? null : `${date}T23:30:00.000Z`,
  };
  if (result !== "pending") rec.profitUnits = realizedProfit(rec);
  return rec;
}
