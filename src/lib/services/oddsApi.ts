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

// Per-outcome filter: decides if an outcome is the YES side, NO side, or to
// be skipped, for a given market. Returns null to skip the outcome entirely.
type OutcomeRole = "yes" | "no" | null;

/**
 * Fetch best odds per player for a given prop market across the date's MLB
 * slate. Parameterized by market key + a YES/NO classifier so it can serve
 * any player prop. Keyed by lowercased player name (The Odds API identifies
 * prop subjects by name, not MLB id).
 */
async function fetchMarketOdds(
  date: string,
  marketKey: string,
  classify: (sideName: string, point?: number) => OutcomeRole,
): Promise<Map<string, BestHrOdds>> {
  // IMPORTANT: The Odds API serves player props ONLY via the per-event odds
  // endpoint, not the bulk /odds endpoint. So we (1) list the day's events,
  // then (2) request the market for each. Verified against the live API.
  //
  // Quota note: empty markets (props not posted yet) cost 0 credits; only
  // events that actually return book data are billed. Props typically post a
  // few hours before first pitch, so early-day calls will be empty.
  const eventsUrl =
    `${env.ODDS_API_BASE}/sports/baseball_mlb/events?` +
    new URLSearchParams({ apiKey: env.ODDS_API_KEY, dateFormat: "iso" });
  const events = await httpFetch<Array<{ id: string; commence_time: string }>>(eventsUrl);

  const todays = events.filter((e) => e.commence_time.slice(0, 10) === date);
  const targetEvents = todays.length > 0 ? todays : events;

  const byPlayer = new Map<string, { yes: Array<{ book: string; price: number }>; no?: number }>();

  for (const ev of targetEvents) {
    const oddsUrl =
      `${env.ODDS_API_BASE}/sports/baseball_mlb/events/${ev.id}/odds?` +
      new URLSearchParams({
        apiKey: env.ODDS_API_KEY,
        regions: "us",
        markets: marketKey,
        oddsFormat: "american",
        dateFormat: "iso",
      });
    let detail: OddsApiEvent;
    try {
      detail = await httpFetch<OddsApiEvent>(oddsUrl);
    } catch (err) {
      log.warn("odds: event fetch failed", { eventId: ev.id, market: marketKey, err: String(err) });
      continue;
    }
    for (const book of detail.bookmakers ?? []) {
      for (const market of book.markets ?? []) {
        if (market.key !== marketKey) continue;
        for (const o of market.outcomes) {
          const player = (o.description ?? "").toLowerCase();
          if (!player) continue;
          const role = classify((o.name ?? "").toLowerCase(), o.point);
          if (role === null) continue;
          const rec = byPlayer.get(player) ?? { yes: [] };
          if (role === "yes") rec.yes.push({ book: book.title, price: o.price });
          else rec.no = o.price;
          byPlayer.set(player, rec);
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
  log.info("odds: live", { date, market: marketKey, players: out.size });
  return out;
}

// ─── Outcome classifiers per market ─────────────────────────────────

// batter_home_runs: Over/Under on a line. ONLY the 0.5 line = "≥1 HR" (what
// our HR model predicts). Over 1.5 ("2+ HRs") must be excluded.
const classifyHrProp = (side: string, point?: number): OutcomeRole => {
  if (point !== undefined && point !== 0.5) return null;
  if (side.includes("over") || side.includes("yes")) return "yes";
  if (side.includes("under") || side.includes("no")) return "no";
  return null;
};

// ─── Public entry ───────────────────────────────────────────────────

/** Live "to hit ≥1 HR" odds keyed by lowercased player name. Empty if no key. */
export async function getLiveHrOddsByName(date: string): Promise<Map<string, BestHrOdds>> {
  if (!hasOddsApi) return new Map();
  const entries = await withCache(`odds:hr:${date}`, env.CACHE_TTL_LINEUPS_S, async () => {
    const map = await fetchMarketOdds(date, "batter_home_runs", classifyHrProp);
    return Array.from(map.entries());
  });
  return new Map(entries);
}

export { hasOddsApi };
