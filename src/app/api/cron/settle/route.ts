// GET /api/cron/settle — settle pending parlays whose games have finished.
// Run by Vercel Cron overnight (after games end). Defaults to settling
// everything pending through yesterday.

import { NextRequest } from "next/server";
import { mlb } from "@/lib/services";
import { historyStore } from "@/lib/storage";
import { deriveOutcome } from "@/lib/storage/record";
import { authorizeCron } from "@/lib/utils/cronAuth";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = authorizeCron(req);
  if (!auth.ok) return Response.json({ error: "Unauthorized" }, { status: auth.status });

  // Settle anything pending up to and including `through` (default: yesterday).
  const through = req.nextUrl.searchParams.get("through") ?? yesterday();
  const nowIso = new Date().toISOString();

  try {
    const store = await historyStore();
    const pending = await store.pendingThrough(through);
    if (pending.length === 0) {
      return Response.json({ through, settled: 0, note: "nothing pending" });
    }

    // Group by date so we fetch each day's HR hitters once.
    const byDate = new Map<string, typeof pending>();
    for (const p of pending) {
      const arr = byDate.get(p.date) ?? [];
      arr.push(p);
      byDate.set(p.date, arr);
    }

    let settled = 0;
    for (const [date, parlays] of byDate) {
      const hitters = await mlb.getHomeRunHitters(date);
      // If no games are final yet for this date, skip — leave pending.
      if (hitters.size === 0) {
        log.info("settle skip — no finals yet", { date });
        continue;
      }
      for (const p of parlays) {
        await store.settle(p.id, deriveOutcome(p, hitters, nowIso));
        settled++;
      }
    }

    log.info("cron settle done", { through, settled });
    return Response.json({ through, settled });
  } catch (err) {
    log.error("cron settle failed", { through, err: String(err) });
    return Response.json({ error: "settle failed" }, { status: 500 });
  }
}

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
