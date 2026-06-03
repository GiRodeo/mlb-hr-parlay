# MLB HR Parlay

Daily MLB home-run parlay recommendation engine. Full stack: data services,
scoring engine, parlay builder, persistence, and a live-wired UI.

## Data status — what's real vs. approximated

The UI now reads exclusively from the API (no mock data in any page). What
each layer actually returns:

| Source | Status |
|---|---|
| MLB Stats API (schedule, lineups, splits, game logs, boxscores) | **Live** — real endpoints |
| Statcast / Savant (batter + pitcher) | **Live** — scraped CSV; expect occasional schema drift |
| FanGraphs (pitcher advanced) | **Live** — unofficial JSON; coerced + defaulted |
| Open-Meteo weather | **Live** in the scoring path; **not** surfaced in the sidebar (that block is labeled "Illustrative") |
| Park factors (`src/data/parkFactors.json`) | **Approximated** — realistic estimates for all 30 parks, NOT a live Statcast pull. Refresh seasonally. |
| Parlay history | **Live** via storage layer; in-memory + seeded in dev, Postgres in prod |

So on a real slate the dashboard, player profiles, and parlays are genuinely
data-driven; the park indices are best-estimate constants and the sidebar
weather is a placeholder until a `/api/weather` endpoint exists.

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
# then:
curl 'http://localhost:3000/api/parlays?date=2026-06-02'
```

## Folder map

```
src/
├── app/                        Next.js App Router. UI + API routes.
│   ├── api/
│   │   ├── health/route.ts     Liveness probe.
│   │   ├── games/route.ts      Today's slate (normalized MLB schedule).
│   │   ├── players/route.ts    All scored batters for a date.
│   │   └── parlays/route.ts    Top 2/3/4-leg parlay bundle for a date.
│   ├── layout.tsx              Root layout + providers.
│   ├── providers.tsx           React Query provider (per-render client).
│   ├── globals.css             Tailwind + shadcn CSS variables.
│   └── page.tsx                Placeholder home page.
│
├── lib/
│   ├── http/fetcher.ts         Server-side fetch w/ retry, timeout, jitter.
│   ├── cache/index.ts          Memory ↔ Redis cache w/ withCache helper.
│   ├── services/               One file per upstream data source.
│   │   ├── mlbStatsApi.ts      Schedule, lineups, batting splits.
│   │   ├── savant.ts           Statcast leaderboards (CSV parser).
│   │   ├── fangraphs.ts        Pitcher advanced (HR/9, FIP, xFIP).
│   │   ├── openMeteo.ts        Hourly weather + outward-wind projection.
│   │   ├── parkFactors.ts      Static park-factor lookup.
│   │   └── index.ts            Barrel re-export.
│   ├── scoring/
│   │   ├── weights.ts          Feature weights (sum to 1.0; validated).
│   │   ├── features.ts         Per-feature 0–100 scorers (pure).
│   │   ├── calibrate.ts        composite → implied HR probability.
│   │   ├── orchestrate.ts      Joins service outputs into PlayerGameContexts.
│   │   └── index.ts            scorePlayer / scoreAndRank.
│   ├── parlayBuilder/
│   │   ├── rules.ts            Construction constants (pool size, caps).
│   │   ├── combinations.ts     Generic K-combinations generator.
│   │   └── index.ts            buildDailyParlays.
│   └── utils/                  env (zod-validated), logger, cn, math.
│
├── stores/uiStore.ts           Zustand UI prefs (date, bucket, theme).
├── hooks/                      React Query hooks for each /api/* route.
├── types/                      Domain types — single source of truth.
└── data/parkFactors.json       Editable park-factor dataset.
```

## How the scoring model works

`PlayerGameContext` is the input: a fully-joined record of the batter, the
opposing pitcher, the park, and the weather. `lib/scoring/orchestrate.ts`
builds these for every batter in today's confirmed lineups by joining the
five service outputs.

`scorePlayer(ctx)` runs nine independent feature scorers (`features.ts`),
each producing a 0–100 subscore:

| Feature      | Weight | Captures |
|--------------|--------|----------|
| `power`      | 0.20   | Statcast barrel rate, hard-hit %, EV, LA |
| `expected`   | 0.18   | xSLG + xwOBA |
| `pitcherVuln`| 0.15   | HR/9, xFIP, barrel% allowed, xSLG allowed |
| `recentForm` | 0.10   | Blended 7/14/30-day HR/PA vs season baseline |
| `park`       | 0.10   | HR index w/ handedness split + altitude |
| `platoon`    | 0.08   | L vs R / R vs L matchup bonus |
| `weather`    | 0.08   | Outward wind component, temp, humidity, rain |
| `lineup`     | 0.06   | PA-weighted batting-order slot |
| `streak`     | 0.05   | Z-score of recent vs season HR rate |

Composite = Σ(subscore × weight). `contributions` reports each subscore's
contribution so the UI can show "why" a player ranks where they do.

`compositeToHrProbability` (calibrate.ts) maps the composite onto an
implied per-game HR probability using a logistic anchored at the league
average (~6%). This is deliberately rough — replace with a fitted curve
once a backtest harness exists.

## How the parlay builder works

Inputs: today's scored players, ranked. The builder:

1. Filters to `composite ≥ 55`.
2. Takes the top 25 as the candidate pool.
3. Enumerates 2/3/4-leg combinations using the rules in `rules.ts` —
   most importantly: **at most one leg per game** and **at most one leg
   per team**. This keeps correlations small enough that naive
   independence is a fair joint-probability approximation.
4. Scores each parlay by blending average composite, log joint
   probability, and a stddev penalty (rewards balance over a single
   spike-and-padding pick).
5. Diversifies the top-N so we don't return five permutations of the
   same elite batter.

## Environment variables

See `.env.example`. All upstream URLs and cache TTLs are configurable;
no API keys are required for any data source.

## Caching strategy

Every service is wrapped in `withCache(key, ttl, loader)`. TTLs differ
by source: schedule 1h, lineups 5m, Statcast 6h, park factors 7d,
weather 30m. In dev the cache lives in process memory; set `REDIS_URL`
in prod for shared cache across instances.

## What's NOT here yet

- UI components (cards, tables, charts). Build under `src/components/`
  using shadcn + Recharts. Hooks are already in place.
- Backtest harness (`scripts/backtest.ts`) for tuning weights from history.
- A regenerate script for `parkFactors.json` from Statcast leaderboards.
- Full park-factor dataset (the JSON has a placeholder — replace before
  any real use).
- Auth, rate limiting on /api routes, and observability beyond the
  structured logger.

## Tech stack

- Next.js 14 (App Router) + React 18
- TypeScript with `strict` and `noUncheckedIndexedAccess`
- Tailwind CSS + shadcn/ui-compatible theme
- TanStack React Query (server state) + Zustand (UI state)
- Recharts (planned for visualization)
- Zod for env + boundary validation
