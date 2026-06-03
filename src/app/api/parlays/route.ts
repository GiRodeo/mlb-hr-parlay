// GET /api/parlays?date=YYYY-MM-DD → today's recommended 2/3/4-leg parlays.

import { NextRequest } from "next/server";
import { getDailyScoredPlayers } from "@/lib/scoring/orchestrate";
import { buildDailyParlays, type ScoredCandidate } from "@/lib/parlayBuilder";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }
  try {
    const scored = await getDailyScoredPlayers(date);
    const candidates: ScoredCandidate[] = scored.map((s) => ({ ...s, gameId: s.gameId, teamId: s.teamId }));
    const bundle = buildDailyParlays(candidates, {
      date,
      generatedAtIso: new Date().toISOString(),
    });
    return Response.json(bundle);
  } catch (err) {
    log.error("parlays route failed", { date, err: String(err) });
    return Response.json({ error: "Failed to build parlays" }, { status: 500 });
  }
}
