// GET /api/games?date=YYYY-MM-DD → today's slate (normalized).
// Thin pass-through to the MLB service so the client never talks to MLB directly.

import { NextRequest } from "next/server";
import { mlb } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? todayUtc();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date; expected YYYY-MM-DD" }, { status: 400 });
  }
  const games = await mlb.getSchedule(date);
  return Response.json({ date, games });
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
