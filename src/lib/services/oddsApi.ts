// Odds service for HR props, sourced from The Odds API (the-odds-api.com)
// when ODDS_API_KEY is set. This is a PAID API — there is no usable free tier
// for player HR props. When no key is configured the value layer simply has
// no market to price against (it shows a "connect an odds feed" state); we do
// NOT fabricate odds.

import { httpFetch } from "@/lib/http/fetcher";
import { withCache } from "@/lib/cache";
import { env, hasOddsApi } from "@/lib/utils/env";
import { log } from "@/lib/utils/logger";
import { asPlayerId } from "@/types";
import { devigTwoWay, devigSingleSideApprox } from "@/lib/betting/odds";
import type { BestHrOdds } from "@/types";

// ─── Live: The Odds API ─────────────────────────────────────────────

interface OddsApiOutcome { name: string; description?: string; price: number; point?: number }
interface OddsApiMarket { key: string; outcomes: OddsApiOutcome[] }
interface OddsApiBook { key: string; title: string; markets: OddsApiMarket[] }
interface OddsApiEvent { id: string; home_team: string; away_team: string; bookmakers: OddsApiBook[] }

/**
 * Fetch best HR ("batter_home_runs" / to-record-a-HR) odds per player for the
 * date's MLB slate. Returns a map keyed by lowercased player name (The Odds
 * API identifies prop subjects by name, not MLB id — the caller name-matches).
 */
async function fetchLiveOdds(date: string): Promise<Map<string, BestHrOdds>> {
  // The Odds API: player HR props live under the baseball_mlb sport, market
  // key "batter_home_runs". Prices are American when oddsFormat=american.
  const url =
    `${env.ODDS_API_BASE}/sports/baseball_mlb/odds?` +
    new URLSearchParams({
      apiKey: env.ODDS_API_KEY,
      regions: "us",
      markets: "batter_home_runs",
      oddsFormat: "american",
      dateFormat: "iso",
    });
  const events = await httpFetch<OddsApiEvent[]>(url);

  // Collect every book's YES price per player, plus a NO price if present.
  const byPlayer = new Map<string, { yes: Array<{ book: string; price: number }>; no?: number }>();
  for (const ev of events) {
    for (const book of ev.bookmakers) {
      for (const market of book.markets) {
        if (market.key !== "batter_home_runs") continue;
        for (const o of market.outcomes) {
          const name = (o.description ?? o.name ?? "").toLowerCase();
          if (!name) continue;
          const isYes = (o.name ?? "").toLowerCase().includes("over") || (o.name ?? "").toLowerCase().includes("yes");
          const rec = byPlayer.get(name) ?? { yes: [] };
          if (isYes) rec.yes.push({ book: book.title, price: o.price });
          else rec.no = o.price;
          byPlayer.set(name, rec);
        }
      }
    }
  }

  const out = new Map<string, BestHrOdds>();
  for (const [name, rec] of byPlayer) {
    if (rec.yes.length === 0) continue;
    // Best price = highest payout for the bettor (largest American value).
    const best = rec.yes.reduce((a, b) => (b.price > a.price ? b : a));
    const marketProb = rec.no !== undefined
      ? devigTwoWay(best.price, rec.no)
      : devigSingleSideApprox(best.price);
    out.set(name, {
      playerId: asPlayerId(0), // resolved by name match in the enrichment step
      playerName: name,
      bestBook: best.book,
      bestAmerican: best.price,
      marketProb,
      allBooks: rec.yes.map((y) => ({ bookmaker: y.book, american: y.price })),
    });
  }
  log.info("odds: live", { date, players: out.size });
  return out;
}

// ─── Public entry ───────────────────────────────────────────────────

/** Live odds keyed by lowercased player name. Empty map when no key is set. */
export async function getLiveHrOddsByName(date: string): Promise<Map<string, BestHrOdds>> {
  if (!hasOddsApi) return new Map();
  // Cache as entries — JSON can't serialize a Map — then rehydrate.
  const entries = await withCache(`odds:live:${date}`, env.CACHE_TTL_LINEUPS_S, async () => {
    const map = await fetchLiveOdds(date);
    return Array.from(map.entries());
  });
  return new Map(entries);
}

export { hasOddsApi };
