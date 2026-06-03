// Per-feature subscore functions. Each returns 0–100. Keeping them isolated
// (and pure) makes them trivial to unit test and tune independently.
//
// The general approach: take a raw stat, compare it against league context
// (or a hand-picked range), and map to 0–100 with linMap or a logistic.

import { clamp, linMap, logisticZTo100, mean, stddev } from "@/lib/utils/math";
import type {
  BattingSplit, BatterStatcast, PitcherStatcast, PitcherAdvanced,
  ParkFactors, BallparkWeather, Handedness, PitcherHandedness,
} from "@/types";

// ─── Recent form: rolling HR/PA vs season HR/PA ─────────────────────
export function recentFormScore(splits: BattingSplit[]): number {
  // Compose 7d/14d/30d each weighted, normalized against the player's own season
  // baseline. This makes the score about *change*, not absolute power.
  const season = splits.find((s) => s.windowDays === "season");
  const baseline = season?.homeRunRatePerPA ?? 0;
  if (baseline === 0) return 50; // unknown baseline → neutral

  const weighted: Array<[number, number]> = [
    [splits.find((s) => s.windowDays === 7)?.homeRunRatePerPA ?? baseline, 0.5],
    [splits.find((s) => s.windowDays === 14)?.homeRunRatePerPA ?? baseline, 0.3],
    [splits.find((s) => s.windowDays === 30)?.homeRunRatePerPA ?? baseline, 0.2],
  ];
  const blended = weighted.reduce((acc, [v, w]) => acc + v * w, 0);
  // Ratio of recent rate to baseline; 1.0 = neutral.
  const ratio = blended / baseline;
  // 0.5x → 25, 1.0x → 50, 2.0x → 100.
  return clamp(linMap(ratio, 0.5, 2.0, 25, 100), 0, 100);
}

// ─── Power: barrel + EV + LA composite ──────────────────────────────
export function powerScore(b: BatterStatcast): number {
  // League-typical ranges (rough, MLB-wide):
  //   barrel rate 4–18%, hard-hit 25–55%, EV 84–94 mph, LA sweet spot ~12–20°.
  const barrel = linMap(b.barrelRate, 0.04, 0.18);            // 0.04 → 0, 0.18 → 100
  const hardHit = linMap(b.hardHitRate, 0.25, 0.55);
  const ev = linMap(b.exitVeloAvgMph, 84, 94);
  // Launch angle scored as proximity to ideal HR window (~22–28°).
  const laBand = 1 - Math.min(1, Math.abs(b.launchAngleAvgDeg - 25) / 15);
  const la = laBand * 100;
  // Weighted: barrels are the single best HR predictor.
  return clamp(barrel * 0.45 + hardHit * 0.20 + ev * 0.20 + la * 0.15, 0, 100);
}

// ─── Expected outcomes: xSLG, xwOBA ─────────────────────────────────
export function expectedScore(b: BatterStatcast): number {
  const xslg = linMap(b.xSlg, 0.300, 0.600);
  const xwoba = linMap(b.xwOba, 0.290, 0.420);
  return clamp(xslg * 0.55 + xwoba * 0.45, 0, 100);
}

// ─── Pitcher vulnerability ──────────────────────────────────────────
export function pitcherVulnScore(p: PitcherAdvanced, ps: PitcherStatcast): number {
  // Higher = more vulnerable to HR.
  const hr9 = linMap(p.hr9, 0.7, 2.5);                        // 0.7 → 0, 2.5 → 100
  const xfip = linMap(p.xFip, 2.8, 5.5);
  // Prefer Savant-derived barrel allowed when present; fall back to FG.
  const barrels = p.barrelPctAllowed ?? ps.barrelRateAllowed;
  const barrelScore = linMap(barrels, 0.04, 0.14);
  const xslgA = linMap(ps.xSlgAllowed, 0.300, 0.520);
  return clamp(hr9 * 0.30 + xfip * 0.20 + barrelScore * 0.30 + xslgA * 0.20, 0, 100);
}

// ─── Park factor ────────────────────────────────────────────────────
export function parkScore(park: ParkFactors, batSide: Handedness): number {
  const idx =
    batSide === "L" ? park.hrIndexVsLhb :
    batSide === "R" ? park.hrIndexVsRhb :
    (park.hrIndexVsLhb + park.hrIndexVsRhb) / 2; // switch hitter avg
  // 80 = strongly suppressing, 100 = neutral, 130 = strongly favorable.
  let s = linMap(idx, 80, 130);
  // Coors-style altitude bonus on top of the index, capped.
  if (park.altitudeFeet > 2_000) s += clamp((park.altitudeFeet - 2_000) / 100, 0, 8);
  return clamp(s, 0, 100);
}

// ─── Platoon advantage ──────────────────────────────────────────────
export function platoonScore(batSide: Handedness, pitcherHand: PitcherHandedness): number {
  if (batSide === "S") return 60; // switch hitters usually +modest advantage
  // Opposite-hand matchups boost HR rate ~10–15% league-wide.
  return batSide !== pitcherHand ? 70 : 40;
}

// ─── Weather ────────────────────────────────────────────────────────
export function weatherScore(w: BallparkWeather): number {
  // Wind: ±15 mph outward swings the scale heavily.
  const wind = linMap(w.windOutwardComponentMph, -15, 15);
  // Temp: ball carries better in heat. 60°F → 30, 95°F → 90.
  const temp = linMap(w.temperatureF, 55, 95, 30, 90);
  // Humidity: high humidity slightly reduces carry; modest effect.
  const humidity = linMap(w.humidityPct, 90, 30, 40, 60);
  // Heavy rain probability suppresses everything (game canceled or HR-suppressing conditions).
  const rainPenalty = clamp(linMap(w.precipitationProbability, 0, 80, 0, 30), 0, 30);
  return clamp(wind * 0.55 + temp * 0.30 + humidity * 0.15 - rainPenalty, 0, 100);
}

// ─── Lineup slot ────────────────────────────────────────────────────
export function lineupScore(battingOrder: number): number {
  // Slots 1–5 get the most plate appearances over a season; slot 9 the fewest.
  // Mapping: 1→90, 2→95, 3→100, 4→100, 5→90, 6→70, 7→55, 8→40, 9→30.
  const table: Record<number, number> = { 1: 90, 2: 95, 3: 100, 4: 100, 5: 90, 6: 70, 7: 55, 8: 40, 9: 30 };
  return table[battingOrder] ?? 50;
}

// ─── Hot/cold streak: z-score of recent vs full distribution ────────
export function streakScore(splits: BattingSplit[]): number {
  // Use 7/14/30 as the sample; treat the season rate as the population mean.
  const season = splits.find((s) => s.windowDays === "season")?.homeRunRatePerPA ?? 0;
  const recents = [7, 14, 30]
    .map((w) => splits.find((s) => s.windowDays === w)?.homeRunRatePerPA)
    .filter((x): x is number => typeof x === "number");
  if (!recents.length || season === 0) return 50;
  const m = mean(recents);
  const sd = stddev(recents) || season * 0.5; // avoid div0
  const z = (m - season) / sd;
  return logisticZTo100(z, 1.2);
}
