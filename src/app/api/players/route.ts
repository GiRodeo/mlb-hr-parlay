// GET /api/players?date=YYYY-MM-DD → all scored batters for the day,
// sorted by composite descending. Used by the (future) player browser UI.

import { NextRequest } from "next/server";
import { getDailyScoredPlayers } from "@/lib/scoring/orchestrate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }
  const players = await getDailyScoredPlayers(date);
  return Response.json({ date, count: players.length, players });
}
