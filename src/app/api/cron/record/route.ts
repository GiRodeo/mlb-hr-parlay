// POST/GET /api/cron/record — record today's recommended parlays as pending
// history rows. Run by Vercel Cron each morning after lineups firm up.
//
// Idempotent: parlay ids are deterministic, so re-runs upsert rather than
// duplicate. This is also where pre-building the daily board warms the cache.

import { NextRequest } from "next/server";
import { getDailyScoredPlayers } from "@/lib/scoring/orchestrate";
import { buildDailyParlays, type ScoredCandidate } from "@/lib/parlayBuilder";
import { historyStore } from "@/lib/storage";
import { toStored } from "@/lib/storage/record";
import { authorizeCron } from "@/lib/utils/cronAuth";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // scoring the whole slate can be slow

export async function GET(req: NextRequest) {
  const auth = authorizeCron(req);
  if (!auth.ok) return Response.json({ error: "Unauthorized" }, { status: auth.status });

  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  try {
    const scored = await getDailyScoredPlayers(date);
    const candidates: ScoredCandidate[] = scored.map((s) => ({ ...s }));
    const bundle = buildDailyParlays(candidates, { date, generatedAtIso: nowIso });

    // Record the top parlay from each bucket (the ones we actually surface).
    const top = [bundle.twoLeg[0], bundle.threeLeg[0], bundle.fourLeg[0]].filter(
      (p): p is NonNullable<typeof p> => Boolean(p),
    );
    const rows = top.map((p) => toStored(date, p, nowIso));

    const store = await historyStore();
    await store.saveMany(rows);

    log.info("cron record done", { date, recorded: rows.length });
    return Response.json({ date, recorded: rows.length, ids: rows.map((r) => r.id) });
  } catch (err) {
    log.error("cron record failed", { date, err: String(err) });
    return Response.json({ error: "record failed" }, { status: 500 });
  }
}
