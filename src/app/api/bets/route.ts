// GET  /api/bets → logged bets + derived bankroll curve & summary
// POST /api/bets → log a new bet  { date, label, americanOdds, stakeUnits, result?, note? }

import { NextRequest } from "next/server";
import { betStore, makeBet } from "@/lib/storage/betStore";
import { computeBankroll } from "@/lib/storage/bankrollSummary";
import { log } from "@/lib/utils/logger";
import type { BankrollResponse, NewBetInput } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = await betStore();
    const bets = await store.list();
    const body: BankrollResponse = { bets, summary: computeBankroll(bets) };
    return Response.json(body);
  } catch (err) {
    log.error("bets GET failed", { err: String(err) });
    return Response.json({ error: "Failed to load bets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let input: NewBetInput;
  try {
    input = (await req.json()) as NewBetInput;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate.
  if (!input?.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return Response.json({ error: "date (YYYY-MM-DD) required" }, { status: 400 });
  }
  if (!input.label || typeof input.label !== "string") {
    return Response.json({ error: "label required" }, { status: 400 });
  }
  if (!Number.isFinite(input.americanOdds) || input.americanOdds === 0) {
    return Response.json({ error: "valid americanOdds required" }, { status: 400 });
  }
  if (!Number.isFinite(input.stakeUnits) || input.stakeUnits <= 0) {
    return Response.json({ error: "stakeUnits must be > 0" }, { status: 400 });
  }
  const allowed = ["won", "lost", "push", "pending"];
  if (input.result && !allowed.includes(input.result)) {
    return Response.json({ error: "invalid result" }, { status: 400 });
  }

  try {
    const store = await betStore();
    const bet = makeBet(input, new Date().toISOString());
    await store.add(bet);
    return Response.json({ ok: true, bet }, { status: 201 });
  } catch (err) {
    log.error("bets POST failed", { err: String(err) });
    return Response.json({ error: "Failed to save bet" }, { status: 500 });
  }
}
