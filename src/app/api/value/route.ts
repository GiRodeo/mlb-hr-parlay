// GET /api/value?date=YYYY-MM-DD → today's HR bets ranked by expected value,
// each with edge vs. the market and a suggested Kelly stake.
//
// Uses live sportsbook odds when ODDS_API_KEY is set, else a clearly-labeled
// demo market (response.usingDemoOdds drives a UI banner).

import { NextRequest } from "next/server";
import { getDailyScoredPlayers } from "@/lib/scoring/orchestrate";
import { buildValuePicks } from "@/lib/betting/value";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }
  try {
    const scored = await getDailyScoredPlayers(date);
    const body = await buildValuePicks(date, scored, new Date().toISOString());
    return Response.json(body);
  } catch (err) {
    log.error("value route failed", { date, err: String(err) });
    return Response.json({ error: "Failed to build value picks" }, { status: 500 });
  }
}
