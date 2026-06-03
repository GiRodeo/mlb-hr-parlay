// GET /api/player/[id]?date=YYYY-MM-DD → a single scored player with the
// 30-game trend attached. Finds the player within today's scored slate so the
// expensive joins are shared with the dashboard's cache.
//
// If the player isn't in today's slate (off day, not in a confirmed lineup),
// returns 404 — the page shows a "not playing today" state.

import { NextRequest } from "next/server";
import { getDailyScoredPlayers } from "@/lib/scoring/orchestrate";
import { buildTrend } from "@/lib/scoring/trend";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "Invalid player id" }, { status: 400 });
  }
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const slate = await getDailyScoredPlayers(date);
    const player = slate.find((p) => p.playerId === id);
    if (!player) {
      return Response.json(
        { error: "Player not in today's slate", playerId: id, date },
        { status: 404 },
      );
    }
    // Attach the 30-game trend (only computed for this single-player view).
    const enriched = {
      ...player,
      display: { ...player.display, trend: await buildTrend(id, date) },
    };
    return Response.json(enriched);
  } catch (err) {
    log.error("player route failed", { id, date, err: String(err) });
    return Response.json({ error: "Failed to load player" }, { status: 500 });
  }
}
