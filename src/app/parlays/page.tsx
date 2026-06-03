// Parlay History & Tracker — wired to /api/history. Filter bar drives the
// query; the server computes summary stats over the filtered set.
"use client";
import { useMemo, useState } from "react";
import { PageContainer, SectionHeading } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/domain/ConfidenceBadge";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { formatAmericanOdds } from "@/lib/utils/confidence";
import { useHistory } from "@/hooks/useHistory";
import type { HistoryFilters, ParlayOutcome, StoredParlay } from "@/types";

const OUTCOME_BADGE: Record<ParlayOutcome, { variant: "high" | "low" | "secondary"; label: string }> = {
  hit: { variant: "high", label: "Hit" },
  miss: { variant: "low", label: "Miss" },
  pending: { variant: "secondary", label: "Pending" },
};

export default function ParlaysHistoryPage() {
  const [legFilter, setLegFilter] = useState("all");
  const [minConfidence, setMinConfidence] = useState("0");

  // Map UI controls → API filter object (memoized so the query key is stable).
  const filters = useMemo<HistoryFilters>(() => {
    const f: HistoryFilters = {};
    if (legFilter !== "all") f.legCount = Number(legFilter) as 2 | 3 | 4;
    if (Number(minConfidence) > 0) f.minConfidence = Number(minConfidence);
    return f;
  }, [legFilter, minConfidence]);

  const { data, isLoading, isError, refetch, isPlaceholderData } = useHistory(filters);
  const summary = data?.summary;
  const parlays = data?.parlays ?? [];

  return (
    <PageContainer>
      <SectionHeading
        title="Parlay History & Tracker"
        subtitle="Outcome tracking and performance for past recommendations"
      />

      {/* summary stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <SummaryStat label="Win rate" value={`${summary.winRatePct.toFixed(0)}%`} sub={`${summary.wins}/${summary.settledCount} settled`} tone={summary.winRatePct >= 50 ? "high" : "low"} />
            <SummaryStat label="ROI" value={`${summary.roiPct >= 0 ? "+" : ""}${summary.roiPct.toFixed(0)}%`} sub="per unit staked" tone={summary.roiPct >= 0 ? "high" : "low"} />
            <SummaryStat label="Avg winner conf." value={summary.avgWinnerConfidence.toFixed(0)} sub="composite of hits" tone="neutral" />
            <SummaryStat label="Tracked" value={String(summary.trackedCount)} sub="parlays in view" tone="neutral" />
          </>
        )}
      </div>

      {/* filter bar */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <FilterField label="Leg count">
            <Select
              value={legFilter}
              onChange={(e) => setLegFilter(e.target.value)}
              options={[
                { value: "all", label: "All" },
                { value: "2", label: "2-leg" },
                { value: "3", label: "3-leg" },
                { value: "4", label: "4-leg" },
              ]}
            />
          </FilterField>
          <FilterField label="Min confidence">
            <Select
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              options={[
                { value: "0", label: "Any" },
                { value: "60", label: "60+" },
                { value: "70", label: "70+" },
                { value: "80", label: "80+" },
              ]}
            />
          </FilterField>
        </CardContent>
      </Card>

      {/* history table */}
      {isError ? (
        <ErrorState message="Couldn't load parlay history." onRetry={() => refetch()} />
      ) : (
        <Card className={`overflow-hidden ${isPlaceholderData ? "opacity-60" : ""}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Legs</TableHead>
                <TableHead>Players</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="text-right">Odds</TableHead>
                <TableHead className="text-right">Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : parlays.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No parlays match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                parlays.map((h) => <HistoryRow key={h.id} parlay={h} />)
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
}

function HistoryRow({ parlay }: { parlay: StoredParlay }) {
  const o = OUTCOME_BADGE[parlay.outcome];
  return (
    <TableRow>
      <TableCell className="stat-figure text-sm">{parlay.date}</TableCell>
      <TableCell>
        <Badge variant="outline">{parlay.legCount}-leg</Badge>
      </TableCell>
      <TableCell className="font-medium">{parlay.playersLabel}</TableCell>
      <TableCell className="text-right">
        <ConfidenceBadge score={parlay.confidence} showLabel={false} size="sm" />
      </TableCell>
      <TableCell className="stat-figure text-right">{formatAmericanOdds(parlay.combinedOdds)}</TableCell>
      <TableCell className="text-right">
        <Badge variant={o.variant}>{o.label}</Badge>
      </TableCell>
    </TableRow>
  );
}

function SummaryStat({
  label, value, sub, tone,
}: {
  label: string; value: string; sub: string; tone: "high" | "low" | "neutral";
}) {
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

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
