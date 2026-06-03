// FanGraphs leaderboards (pitcher advanced). Their public JSON endpoints
// are unofficial; assume schema may shift. We coerce-and-default rather
// than fail — a missing xFIP shouldn't blow up scoring for a whole slate.

import { httpFetch } from "@/lib/http/fetcher";
import { withCache } from "@/lib/cache";
import { env } from "@/lib/utils/env";
import { log } from "@/lib/utils/logger";
import { asPlayerId, type FangraphsRawPitcherRow, type PitcherAdvanced } from "@/types";

interface FangraphsLeaderboardResponse {
  data: FangraphsRawPitcherRow[];
}

/**
 * Returns a map keyed by FanGraphs playerid (which equals MLB Stats API
 * playerId for the vast majority of pitchers). For mismatches we fall back
 * to a name match in the calling layer.
 */
export async function getPitcherAdvancedSeason(season: number): Promise<Map<number, PitcherAdvanced>> {
  const key = `fg:pitchers:${season}`;
  return withCache(key, env.CACHE_TTL_STATCAST_S, async () => {
    // Type 8 = standard pitching; ind=0 aggregates all teams; qual=10 IP min.
    const url =
      `${env.FANGRAPHS_BASE}/api/leaders/major-league/data?` +
      new URLSearchParams({
        pos: "all",
        stats: "pit",
        lg: "all",
        qual: "10",
        season: String(season),
        season1: String(season),
        ind: "0",
        type: "8",
      });

    const raw = await httpFetch<FangraphsLeaderboardResponse>(url);
    const out = new Map<number, PitcherAdvanced>();
    for (const r of raw.data ?? []) {
      const id = Number(r.playerid);
      if (!Number.isFinite(id)) continue;
      out.set(id, {
        playerId: asPlayerId(id),
        ip: num(r.IP),
        hr9: num(r["HR/9"]),
        fip: num(r.FIP),
        xFip: num(r.xFIP),
        k9: num(r["K/9"] ?? 0),
        bb9: num(r["BB/9"] ?? 0),
        barrelPctAllowed: r["Barrel%"] !== undefined ? num(r["Barrel%"]) / 100 : undefined,
        hardHitPctAllowed: r["HardHit%"] !== undefined ? num(r["HardHit%"]) / 100 : undefined,
      });
    }
    log.info("fangraphs pitchers", { season, count: out.size });
    return out;
  });
}

const num = (v: number | string | undefined) => {
  if (v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
