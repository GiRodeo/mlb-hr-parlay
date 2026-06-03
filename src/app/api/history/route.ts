// GET /api/history?legCount=&minConfidence=&since= → tracked parlays + summary.

import { NextRequest } from "next/server";
import { historyStore } from "@/lib/storage";
import { computeSummary } from "@/lib/storage/summary";
import type { HistoryFilters, HistoryResponse } from "@/types";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filters: HistoryFilters = {};

  const legCount = sp.get("legCount");
  if (legCount && ["2", "3", "4"].includes(legCount)) {
    filters.legCount = Number(legCount) as 2 | 3 | 4;
  }
  const minConf = sp.get("minConfidence");
  if (minConf && Number.isFinite(Number(minConf))) filters.minConfidence = Number(minConf);

  const since = sp.get("since");
  if (since && /^\d{4}-\d{2}-\d{2}$/.test(since)) filters.sinceDate = since;

  try {
    const store = await historyStore();
    const parlays = await store.list(filters);
    // Summary is computed over the filtered view so the header reflects filters.
    const body: HistoryResponse = { parlays, summary: computeSummary(parlays) };
    return Response.json(body);
  } catch (err) {
    log.error("history route failed", { err: String(err) });
    return Response.json({ error: "Failed to load history" }, { status: 500 });
  }
}
