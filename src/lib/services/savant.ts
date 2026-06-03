// Baseball Savant service. Savant exposes a CSV search endpoint (the same
// one their leaderboards UI uses). We hit it server-side, parse, normalize.
//
// We intentionally pull season-to-date splits with a generous PA filter to
// stabilize barrel rate / xSLG before they're useful.

import { httpFetch } from "@/lib/http/fetcher";
import { withCache } from "@/lib/cache";
import { env } from "@/lib/utils/env";
import { log } from "@/lib/utils/logger";
import {
  asPlayerId,
  type BatterStatcast, type PitcherStatcast,
  type SavantRawBatterRow, type SavantRawPitcherRow,
} from "@/types";

// ─── Batters ────────────────────────────────────────────────────────

export async function getBatterStatcastSeason(season: number): Promise<Map<number, BatterStatcast>> {
  const key = `savant:batters:${season}`;
  return withCache(key, env.CACHE_TTL_STATCAST_S, async () => {
    // statcast_search returns CSV when type=details; for leaderboards we use
    // the leaderboard.csv? endpoint. Min 100 PA filters out noise.
    const url =
      `${env.SAVANT_BASE}/leaderboard/custom?` +
      new URLSearchParams({
        year: String(season),
        type: "batter",
        filter: "",
        sort: "barrel_batted_rate",
        sortDir: "desc",
        min: "100",
        selections: [
          "player_id", "player_name", "pa", "ab", "hr",
          "barrel_batted_rate", "hard_hit_percent",
          "exit_velocity_avg", "launch_angle_avg",
          "xslg", "xwoba", "sweet_spot_percent",
        ].join(","),
        csv: "true",
      });

    const csv = await httpFetch<string>(url, { parse: "text" });
    const rows = parseCsv<SavantRawBatterRow>(csv);
    const out = new Map<number, BatterStatcast>();
    for (const r of rows) {
      const id = Number(r.player_id);
      if (!Number.isFinite(id)) continue;
      out.set(id, {
        playerId: asPlayerId(id),
        pa: num(r.pa),
        hr: num(r.hr),
        barrelRate: pct(r.barrel_batted_rate),
        hardHitRate: pct(r.hard_hit_percent),
        exitVeloAvgMph: num(r.exit_velocity_avg),
        launchAngleAvgDeg: num(r.launch_angle_avg),
        xSlg: num(r.xslg),
        xwOba: num(r.xwoba),
        sweetSpotRate: pct(r.sweet_spot_percent),
      });
    }
    log.info("savant batters", { season, count: out.size });
    return out;
  });
}

// ─── Pitchers ───────────────────────────────────────────────────────

export async function getPitcherStatcastSeason(season: number): Promise<Map<number, PitcherStatcast>> {
  const key = `savant:pitchers:${season}`;
  return withCache(key, env.CACHE_TTL_STATCAST_S, async () => {
    const url =
      `${env.SAVANT_BASE}/leaderboard/custom?` +
      new URLSearchParams({
        year: String(season),
        type: "pitcher",
        sort: "barrel_batted_rate",
        sortDir: "asc",
        min: "100",
        selections: [
          "player_id", "player_name", "pa", "ip", "hr",
          "barrel_batted_rate", "hard_hit_percent",
          "exit_velocity_avg",
          "xslg", "xwoba",
        ].join(","),
        csv: "true",
      });
    const csv = await httpFetch<string>(url, { parse: "text" });
    const rows = parseCsv<SavantRawPitcherRow>(csv);
    const out = new Map<number, PitcherStatcast>();
    for (const r of rows) {
      const id = Number(r.player_id);
      if (!Number.isFinite(id)) continue;
      out.set(id, {
        playerId: asPlayerId(id),
        pa: num(r.pa),
        ip: num(r.ip),
        hr: num(r.hr),
        barrelRateAllowed: pct(r.barrel_batted_rate),
        hardHitRateAllowed: pct(r.hard_hit_percent),
        exitVeloAllowedMph: num(r.exit_velocity_avg),
        xSlgAllowed: num(r.xslg),
        xwObaAllowed: num(r.xwoba),
      });
    }
    log.info("savant pitchers", { season, count: out.size });
    return out;
  });
}

// ─── CSV parsing ────────────────────────────────────────────────────
// Savant CSVs are well-behaved: no embedded newlines, comma-separated,
// double-quoted strings only when names contain commas. A minimal parser is
// safer than pulling a CSV dependency and lets us keep types tight.

function parseCsv<T extends Record<string, string>>(csv: string): T[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.length);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {} as Record<string, string>;
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row as T;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === ",") { out.push(cur); cur = ""; }
      else if (c === '"') inQ = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const num = (s: string) => (s === "" ? 0 : Number(s));
// Savant returns barrel% as e.g. "12.4" (already a percent). Convert to 0–1.
const pct = (s: string) => (s === "" ? 0 : Number(s) / 100);
