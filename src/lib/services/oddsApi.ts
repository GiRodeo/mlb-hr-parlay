// Odds service for HR props. Two sources:
//   - LIVE: The Odds API (the-odds-api.com) when ODDS_API_KEY is set. This is
//     a PAID API — there is no usable free tier for player HR props.
//   - DEMO: a deterministic generator used when no key is present, so the
//     value/EV feature is fully testable without paying. Demo odds are CLEARLY
//     flagged (isDemo) and the UI shows a banner. We never present demo odds
//     as if they were a real market.
//
// Design note on the demo source: it derives a believable market price from a
// player's model probability, then adds a deterministic offset so the market
// is sometimes sharper and sometimes softer than our model. That keeps +EV
// edges small and occasional — like a real, efficient market — rather than
// making every pick look like free money (which would be a lie).

import { httpFetch } from "@/lib/http/fetcher";
import { withCache } from "@/lib/cache";
import { env, hasOddsApi } from "@/lib/utils/env";
import { log } from "@/lib/utils/logger";
import { asPlayerId } from "@/types";
import { decimalToAmerican, americanToImpliedProb, devigTwoWay, devigSingleSideApprox } from "@/lib/betting/odds";
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
      isDemo: false,
    });
  }
  log.info("odds: live", { date, players: out.size });
  return out;
}

// ─── Demo: deterministic synthetic market ───────────────────────────

const DEMO_BOOKS = ["DraftKings", "FanDuel", "BetMGM", "Caesars"];

// Deterministic per-player offset so demo odds are stable across reloads and
// sometimes sharper / sometimes softer than the model (no Math.random).
function demoOffset(seed: number): number {
  // ~[-0.03, +0.03] swing on the market's probability vs the model.
  return (Math.sin(seed * 2.3) + Math.cos(seed * 1.1)) / 2 * 0.03;
}

/**
 * Build demo odds for a set of (playerId, name, modelProb) inputs. The market
 * prob is the model prob nudged by a deterministic offset; each book gets a
 * slightly different price so line-shopping has something to show.
 */
export function buildDemoOdds(
  players: Array<{ playerId: number; name: string; modelProb: number }>,
): Map<number, BestHrOdds> {
  const out = new Map<number, BestHrOdds>();
  players.forEach((p, i) => {
    const fairProb = Math.max(0.02, Math.min(0.45, p.modelProb + demoOffset(p.playerId || i + 1)));
    // Add a typical book margin to the fair prob to get the posted implied prob.
    const margin = 0.10;
    const postedProb = Math.min(0.6, fairProb * (1 + margin));
    const baseAmerican = decimalToAmerican(1 / postedProb);

    // Each book varies the price a touch around the base.
    const allBooks = DEMO_BOOKS.map((b, bi) => {
      const wobble = Math.round((Math.sin((p.playerId || i + 1) * (bi + 1)) ) * 18);
      return { bookmaker: b, american: baseAmerican + wobble };
    });
    const best = allBooks.reduce((a, b) => (b.american > a.american ? b : a));
    // De-vig the best posted price back to a fair market prob.
    const marketProb = americanToImpliedProb(best.american) / (1 + margin);

    out.set(p.playerId, {
      playerId: asPlayerId(p.playerId),
      playerName: p.name,
      bestBook: best.bookmaker,
      bestAmerican: best.american,
      marketProb,
      allBooks,
      isDemo: true,
    });
  });
  return out;
}

// ─── Public entry ───────────────────────────────────────────────────

/** Live odds keyed by lowercased player name. Empty map in demo mode. */
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
