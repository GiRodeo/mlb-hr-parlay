// Value page — the betting brain. Ranks today's HR bets by expected value
// (our model probability vs. the de-vigged market), shows the edge, the best
// available price/book, and a Kelly-sized stake. Plus a model-reliability
// section so you can judge whether to trust the probabilities at all.
"use client";

import { Fragment, useState } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useValue } from "@/hooks/useValue";
import { useCalibration } from "@/hooks/useCalibration";
import { PageContainer, SectionHeading } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ReliabilityChart } from "@/components/domain/ReliabilityChart";
import { ProjectedBanner } from "@/components/domain/ProjectedBanner";
import { CardGridSkeleton, EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { formatAmerican } from "@/lib/betting/odds";
import Link from "next/link";
import type { ValuePick } from "@/types";

export default function ValuePage() {
  const date = useUiStore((s) => s.selectedDate);
  const value = useValue(date);
  const calibration = useCalibration();

  const picks = value.data?.picks ?? [];
  const positive = picks.filter((p) => p.positiveEv);

  return (
    <PageContainer>
      <SectionHeading
        title="Value Finder"
        subtitle="Where our model disagrees with the market — ranked by expected value"
      />

      {/* EV table */}
      {value.isLoading ? (
        <CardGridSkeleton count={3} />
      ) : value.isError ? (
        <ErrorState message="Couldn't load value picks." onRetry={() => value.refetch()} />
      ) : value.data && !value.data.oddsConfigured ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-3xl" aria-hidden>🔌</span>
            <h3 className="text-lg font-semibold">No live odds feed connected</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              The Value Finder compares our model against real sportsbook prices to find
              expected-value edges. It needs a live odds source to do that. Set an{" "}
              <code className="rounded bg-muted px-1">ODDS_API_KEY</code> (The Odds API) in your
              environment to enable live HR-prop pricing, EV, and Kelly staking.
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              We intentionally don&apos;t show simulated odds here — every price on this page
              is a real market line or nothing at all.
            </p>
          </CardContent>
        </Card>
      ) : picks.length === 0 ? (
        <EmptyState
          title="No priced bets for this date"
          message="The odds feed returned no HR props for today's slate, or lineups aren't set yet. Try another date."
        />
      ) : (
        <>
          <div className="mb-3 text-sm text-muted-foreground">
            <span className="font-semibold text-confidence-high">{positive.length}</span> of {picks.length}{" "}
            priced bets show positive expected value.
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Model</TableHead>
                  <TableHead className="text-right">Market</TableHead>
                  <TableHead className="text-right">Edge</TableHead>
                  <TableHead className="text-right">Best price</TableHead>
                  <TableHead className="text-right">EV</TableHead>
                  <TableHead className="text-right">Kelly</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {picks.map((p) => <ValueRow key={String(p.playerId)} pick={p} />)}
              </TableBody>
            </Table>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground">
            <strong>Model</strong> = our HR probability. <strong>Market</strong> = de-vigged book probability.
            <strong> Edge</strong> = model − market. <strong>EV</strong> = expected profit per unit staked at the
            best price. <strong>Kelly</strong> = suggested stake (¼-Kelly, capped at 5% of a 100-unit bankroll).
            Only positive-EV bets get a stake. Odds sourced live from US sportsbooks via The Odds API —
            click a row to compare prices across books.
          </p>
        </>
      )}

      {/* Model reliability */}
      <div className="mt-10">
        <SectionHeading
          title="Can you trust these numbers?"
          subtitle="Model calibration — predicted HR probability vs. what actually happened"
        />
        {calibration.isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : calibration.isError || !calibration.data ? (
          <ErrorState message="Couldn't load calibration." onRetry={() => calibration.refetch()} />
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                Reliability curve
                <span className="flex items-center gap-3 text-xs font-normal text-muted-foreground">
                  <span>ECE <span className="stat-figure font-semibold text-foreground">{(calibration.data.ece * 100).toFixed(1)}%</span></span>
                  <span>Brier <span className="stat-figure font-semibold text-foreground">{calibration.data.brier.toFixed(3)}</span></span>
                  {calibration.data.isSampleData && <Badge variant="med-soft">Sample data</Badge>}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ReliabilityChart data={calibration.data} />
              <p className="mt-2 text-xs text-muted-foreground">
                Points on the dashed diagonal = perfectly calibrated. Below it = the model
                is overconfident in that range; above = underconfident.
                {calibration.data.isSampleData && (
                  <> <strong>Note:</strong> this is seeded sample data — real calibration needs a
                  prediction-vs-outcome log accumulated over many slates (the backtest harness, still to come).</>
                )}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

function ValueRow({ pick }: { pick: ValuePick }) {
  const [open, setOpen] = useState(false);
  const evColor = pick.evPercent > 0 ? "text-confidence-high" : "text-confidence-low";
  const edgeColor = pick.edge > 0 ? "text-confidence-high" : "text-muted-foreground";
  const canShop = pick.allBooks.length > 1;

  return (
    <Fragment>
      <TableRow
        className={canShop ? "cursor-pointer" : ""}
        onClick={canShop ? () => setOpen((o) => !o) : undefined}
        aria-expanded={canShop ? open : undefined}
      >
        <TableCell>
          <Link href={`/player/${pick.playerId}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
            {pick.fullName}
          </Link>
          <div className="text-xs text-muted-foreground">{pick.teamAbbr} · {pick.matchup}</div>
        </TableCell>
        <TableCell className="stat-figure text-right">{(pick.modelProb * 100).toFixed(1)}%</TableCell>
        <TableCell className="stat-figure text-right text-muted-foreground">{(pick.marketProb * 100).toFixed(1)}%</TableCell>
        <TableCell className={`stat-figure text-right font-semibold ${edgeColor}`}>
          {pick.edge > 0 ? "+" : ""}{(pick.edge * 100).toFixed(1)}%
        </TableCell>
        <TableCell className="text-right">
          <span className="stat-figure">{formatAmerican(pick.bestAmerican)}</span>
          <div className="text-[10px] text-muted-foreground">
            {pick.bestBook}
            {canShop && <span className="ml-1">· {pick.allBooks.length} books {open ? "▴" : "▾"}</span>}
          </div>
        </TableCell>
        <TableCell className={`stat-figure text-right font-bold ${evColor}`}>
          {pick.evPercent > 0 ? "+" : ""}{(pick.evPercent * 100).toFixed(0)}%
        </TableCell>
        <TableCell className="stat-figure text-right">
          {pick.kellyUnits > 0 ? `${pick.kellyUnits}u` : <span className="text-muted-foreground">—</span>}
        </TableCell>
      </TableRow>

      {/* Line shopping: every book's price for this player, best first. */}
      {open && canShop && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="bg-secondary/40">
            <div className="px-2 py-1">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Line shopping — best price wins
              </div>
              <div className="flex flex-wrap gap-2">
                {pick.allBooks.map((b, i) => (
                  <span
                    key={b.bookmaker}
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                      i === 0 ? "border-confidence-high/40 bg-confidence-high/10" : "border-border bg-card"
                    }`}
                  >
                    <span className="font-medium">{b.bookmaker}</span>
                    <span className="stat-figure">{formatAmerican(b.american)}</span>
                    {i === 0 && <span className="text-[10px] font-semibold text-confidence-high">BEST</span>}
                  </span>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}
