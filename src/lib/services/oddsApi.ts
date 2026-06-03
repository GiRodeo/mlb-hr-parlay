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
  // IMPORTANT: The Odds API serves player props ONLY via the per-event odds
  // endpoint, not the bulk /odds endpoint. So we (1) list the day's events,
  // then (2) request batter_home_runs for each. Verified against the live API.
  //
  // Quota note: empty markets (props not posted yet) cost 0 credits; only
  // events that actually return book data are billed. HR props typically post
  // a few hours before first pitch, so early-day calls will be empty.
  const eventsUrl =
    `${env.ODDS_API_BASE}/sports/baseball_mlb/events?` +
    new URLSearchParams({ apiKey: env.ODDS_API_KEY, dateFormat: "iso" });
  const events = await httpFetch<Array<{ id: string; commence_time: string }>>(eventsUrl);

  // Keep events on the requested date (UTC date of commence_time).
  const todays = events.filter((e) => e.commence_time.slice(0, 10) === date);
  const targetEvents = todays.length > 0 ? todays : events; // fall back to all if none match

  // Collect every book's YES (to hit a HR) price per player, plus NO if posted.
  const byPlayer = new Map<string, { yes: Array<{ book: string; price: number }>; no?: number }>();

  for (const ev of targetEvents) {
    const oddsUrl =
      `${env.ODDS_API_BASE}/sports/baseball_mlb/events/${ev.id}/odds?` +
      new URLSearchParams({
        apiKey: env.ODDS_API_KEY,
        regions: "us",
        markets: "batter_home_runs",
        oddsFormat: "american",
        dateFormat: "iso",
      });
    let detail: OddsApiEvent;
    try {
      detail = await httpFetch<OddsApiEvent>(oddsUrl);
    } catch (err) {
      log.warn("odds: event fetch failed", { eventId: ev.id, err: String(err) });
      continue;
    }
    for (const book of detail.bookmakers ?? []) {
      for (const market of book.markets ?? []) {
        // ONLY batter_home_runs — NOT batter_first_home_run. "First HR of the
        // game" is a different, much rarer event (one winner per game) and must
        // never be compared against our P(≥1 HR) model.
        if (market.key !== "batter_home_runs") continue;
        for (const o of market.outcomes) {
          // For HR props the player is in `description`; `name` is the side
          // ("Over"/"Under"); `point` is the line.
          const player = (o.description ?? "").toLowerCase();
          if (!player) continue;

          // CRITICAL: only the 0.5 line means "to hit at least 1 HR" — which
          // is what our model predicts. Books may also post Over 1.5 ("2+
          // HRs"); including those would compare apples to oranges and invent
          // fake edge. Accept point===0.5, or a missing point (some books omit
          // it for the standard market).
          if (o.point !== undefined && o.point !== 0.5) continue;

          const side = (o.name ?? "").toLowerCase();
          const isYes = side.includes("over") || side.includes("yes");
          const isNo = side.includes("under") || side.includes("no");
          const rec = byPlayer.get(player) ?? { yes: [] };
          if (isYes) rec.yes.push({ book: book.title, price: o.price });
          else if (isNo) rec.no = o.price;
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
