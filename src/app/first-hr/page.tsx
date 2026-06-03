// First Home Run page. Ranks batters by their modeled probability of hitting
// the GAME'S FIRST home run — a race that rewards both HR power and early
// batting-order timing. Shows live first-HR odds + EV when a feed is set.
"use client";

import Link from "next/link";
import { useUiStore } from "@/stores/uiStore";
import { useFirstHr } from "@/hooks/useFirstHr";
import { PageContainer, SectionHeading } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { ProjectedBanner } from "@/components/domain/ProjectedBanner";
import { formatAmerican } from "@/lib/betting/odds";
import type { FirstHrPick } from "@/types";

export default function FirstHrPage() {
  const date = useUiStore((s) => s.selectedDate);
  const q = useFirstHr(date);
  const picks = q.data?.picks ?? [];
  const oddsAvailable = q.data?.oddsAvailable ?? false;

  return (
    <PageContainer>
      <SectionHeading
        title="First Home Run"
        subtitle="Who hits the game's first HR — a race of power × batting-order timing"
      />

      {q.isLoading ? (
        <CardGridSkeleton count={3} />
      ) : q.isError ? (
        <ErrorState message="Couldn't load first-HR model." onRetry={() => q.refetch()} />
      ) : picks.length === 0 ? (
        <EmptyState
          title="No players to model yet"
          message="Lineups aren't set for this date, or there are no games. Try another date."
        />
      ) : (
        <>
          {!oddsAvailable && (
            <p className="mb-3 text-xs text-muted-foreground">
              Showing model probabilities only — no live <code className="rounded bg-muted px-1">batter_first_home_run</code>{" "}
              odds are posted right now (these markets appear close to game time). EV/edge fill in when prices are available.
            </p>
          )}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Order</TableHead>
                  <TableHead className="text-right">First-HR prob</TableHead>
                  <TableHead className="text-right">Best price</TableHead>
                  <TableHead className="text-right">Edge</TableHead>
                  <TableHead className="text-right">EV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {picks.slice(0, 40).map((p) => <FirstHrRow key={String(p.playerId)} pick={p} />)}
              </TableBody>
            </Table>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground">
            <strong>First-HR prob</strong> is from a survival model: it walks the game&apos;s plate
            appearances in order and credits each batter with the chance no one has homered yet ×
            their HR rate. Earlier hitters are favored at equal power. Probabilities across a game
            sum to the chance the game has any HR at all.
          </p>
        </>
      )}
    </PageContainer>
  );
}

function FirstHrRow({ pick }: { pick: FirstHrPick }) {
  const hasOdds = pick.bestAmerican !== undefined;
  const evColor = (pick.evPercent ?? 0) > 0 ? "text-confidence-high" : "text-confidence-low";
  const edgeColor = (pick.edge ?? 0) > 0 ? "text-confidence-high" : "text-muted-foreground";
  return (
    <TableRow>
      <TableCell>
        <Link href={`/player/${pick.playerId}`} className="font-medium hover:underline">
          {pick.fullName}
        </Link>
        <div className="text-xs text-muted-foreground">{pick.teamAbbr} · {pick.matchup}</div>
      </TableCell>
      <TableCell className="stat-figure text-right">{pick.battingOrder || "—"}</TableCell>
      <TableCell className="stat-figure text-right font-semibold">{(pick.firstHrProb * 100).toFixed(1)}%</TableCell>
      <TableCell className="text-right">
        {hasOdds ? (
          <>
            <span className="stat-figure">{formatAmerican(pick.bestAmerican!)}</span>
            <div className="text-[10px] text-muted-foreground">{pick.bestBook}</div>
          </>
        ) : <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className={`stat-figure text-right ${edgeColor}`}>
        {hasOdds ? `${(pick.edge ?? 0) > 0 ? "+" : ""}${((pick.edge ?? 0) * 100).toFixed(1)}%` : "—"}
      </TableCell>
      <TableCell className={`stat-figure text-right font-bold ${hasOdds ? evColor : ""}`}>
        {hasOdds ? `${(pick.evPercent ?? 0) > 0 ? "+" : ""}${((pick.evPercent ?? 0) * 100).toFixed(0)}%` : "—"}
      </TableCell>
    </TableRow>
  );
}
