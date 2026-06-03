// Bankroll & Staking Tracker. Log bets (player, odds, stake, result), watch
// the bankroll curve, and track ROI / win rate / max drawdown. Built on the
// same Kelly + odds math as the Value page.
"use client";

import { useState } from "react";
import { PageContainer, SectionHeading } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { BankrollChart } from "@/components/domain/BankrollChart";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useBets, useAddBet } from "@/hooks/useBets";
import { useUiStore } from "@/stores/uiStore";
import { formatAmerican } from "@/lib/betting/odds";
import type { BetRecord, BetResult } from "@/types";

const RESULT_BADGE: Record<BetResult, { variant: "high" | "low" | "secondary" | "outline"; label: string }> = {
  won: { variant: "high", label: "Won" },
  lost: { variant: "low", label: "Lost" },
  push: { variant: "outline", label: "Push" },
  pending: { variant: "secondary", label: "Pending" },
};

export default function BankrollPage() {
  const { data, isLoading, isError, refetch } = useBets();
  const summary = data?.summary;

  return (
    <PageContainer>
      <SectionHeading
        title="Bankroll & Staking"
        subtitle="Track your bets, bankroll curve, and ROI — discipline is where returns are won"
      />

      {/* summary stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {isLoading || !summary ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <Stat label="Bankroll" value={`${summary.currentBankroll}u`} sub={`from ${summary.startingBankroll}u`} tone={summary.currentBankroll >= summary.startingBankroll ? "high" : "low"} />
            <Stat label="Net P&L" value={`${summary.netProfitUnits >= 0 ? "+" : ""}${summary.netProfitUnits}u`} sub="units" tone={summary.netProfitUnits >= 0 ? "high" : "low"} />
            <Stat label="ROI" value={`${summary.roiPct >= 0 ? "+" : ""}${summary.roiPct}%`} sub="per unit staked" tone={summary.roiPct >= 0 ? "high" : "low"} />
            <Stat label="Win rate" value={`${summary.winRatePct}%`} sub={`${summary.wins}-${summary.losses}`} tone="neutral" />
            <Stat label="Max drawdown" value={`${summary.maxDrawdownPct}%`} sub="peak to trough" tone={summary.maxDrawdownPct > 25 ? "low" : "neutral"} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle>Bankroll over time</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {isLoading || !summary ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <BankrollChart curve={summary.curve} starting={summary.startingBankroll} />
            )}
          </CardContent>
        </Card>

        {/* log form */}
        <Card>
          <CardHeader className="pb-2"><CardTitle>Log a bet</CardTitle></CardHeader>
          <CardContent className="pt-2">
            <AddBetForm />
          </CardContent>
        </Card>
      </div>

      {/* bets table */}
      <div className="mt-6">
        {isError ? (
          <ErrorState message="Couldn't load bets." onRetry={() => refetch()} />
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bet</TableHead>
                  <TableHead className="text-right">Odds</TableHead>
                  <TableHead className="text-right">Stake</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.bets ?? []).map((b) => <BetRow key={b.id} bet={b} />)}
                {!isLoading && (data?.bets.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No bets logged yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Bankroll is in <strong>units</strong> (starting at 100). Suggested stakes elsewhere use ¼-Kelly.
        Logged bets persist to the database when one is configured; otherwise they reset on restart.
      </p>
    </PageContainer>
  );
}

function AddBetForm() {
  const add = useAddBet();
  const today = useUiStore((s) => s.selectedDate);
  const [label, setLabel] = useState("");
  const [odds, setOdds] = useState("");
  const [stake, setStake] = useState("1");
  const [result, setResult] = useState<BetResult>("pending");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const americanOdds = Number(odds);
    const stakeUnits = Number(stake);
    if (!label.trim() || !Number.isFinite(americanOdds) || americanOdds === 0 || stakeUnits <= 0) return;
    add.mutate(
      { date: today, label: label.trim(), americanOdds, stakeUnits, result },
      { onSuccess: () => { setLabel(""); setOdds(""); setStake("1"); setResult("pending"); } },
    );
  };

  const input = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Bet">
        <input className={input} placeholder="e.g. Aaron Judge HR" value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Odds (American)">
          <input className={input} placeholder="+250" value={odds} onChange={(e) => setOdds(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Stake (units)">
          <input className={input} placeholder="1" value={stake} onChange={(e) => setStake(e.target.value)} inputMode="decimal" />
        </Field>
      </div>
      <Field label="Result">
        <Select
          value={result}
          onChange={(e) => setResult(e.target.value as BetResult)}
          className="w-full"
          options={[
            { value: "pending", label: "Pending" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
            { value: "push", label: "Push" },
          ]}
        />
      </Field>
      <Button type="submit" disabled={add.isPending} className="w-full">
        {add.isPending ? "Saving…" : "Add bet"}
      </Button>
      {add.isError && <p className="text-xs text-confidence-low">{(add.error as Error).message}</p>}
      <p className="text-[11px] text-muted-foreground">
        Bet date uses the app&apos;s selected date ({today}). Change it in the top nav.
      </p>
    </form>
  );
}

function BetRow({ bet }: { bet: BetRecord }) {
  const r = RESULT_BADGE[bet.result];
  const pnl = bet.profitUnits;
  const pnlColor = pnl == null ? "text-muted-foreground" : pnl > 0 ? "text-confidence-high" : pnl < 0 ? "text-confidence-low" : "";
  return (
    <TableRow>
      <TableCell className="stat-figure text-sm">{bet.date}</TableCell>
      <TableCell className="font-medium">{bet.label}</TableCell>
      <TableCell className="stat-figure text-right">{formatAmerican(bet.americanOdds)}</TableCell>
      <TableCell className="stat-figure text-right">{bet.stakeUnits}u</TableCell>
      <TableCell className="text-right"><Badge variant={r.variant}>{r.label}</Badge></TableCell>
      <TableCell className={`stat-figure text-right font-semibold ${pnlColor}`}>
        {pnl == null ? "—" : `${pnl > 0 ? "+" : ""}${pnl.toFixed(2)}u`}
      </TableCell>
    </TableRow>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "high" | "low" | "neutral" }) {
  const color = tone === "high" ? "text-confidence-high" : tone === "low" ? "text-confidence-low" : "text-navy";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`stat-figure mt-1 text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
