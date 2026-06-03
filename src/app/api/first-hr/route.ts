// GET /api/first-hr?date=YYYY-MM-DD → each batter's modeled probability of
// hitting the game's FIRST home run, joined with live batter_first_home_run
// odds + EV when an odds feed is configured.

import { NextRequest } from "next/server";
import { getDailyScoredPlayers } from "@/lib/scoring/orchestrate";
import { buildFirstHrPicks } from "@/lib/betting/firstHrValue";
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
    const body = await buildFirstHrPicks(date, scored, new Date().toISOString());
    return Response.json(body);
  } catch (err) {
    log.error("first-hr route failed", { date, err: String(err) });
    return Response.json({ error: "Failed to build first-HR picks" }, { status: 500 });
  }
}
