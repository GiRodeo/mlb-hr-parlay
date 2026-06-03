// Parlay History & Tracker — wired to /api/history. Filter bar drives the
// query; the server computes summary stats over the filtered set. Rows are
// clickable to expand a per-leg outcome breakdown.
"use client";
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer, SectionHeading } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/domain/ConfidenceBadge";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { formatAmericanOdds } from "@/lib/utils/confidence";
import { useHistory } from "@/hooks/useHistory";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";
import type { HistoryFilters, ParlayOutcome, StoredParlay } from "@/types";

const OUTCOME_BADGE: Record<ParlayOutcome, { variant: "high" | "low" | "secondary"; label: string }> = {
  hit: { variant: "high", label: "Hit" },
  miss: { variant: "low", label: "Miss" },
  pending: { variant: "secondary", label: "Pending" },
};

// Subtract `days` from a YYYY-MM-DD string (UTC-safe), returning YYYY-MM-DD.
function minusDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

// Columns the table can sort by.
type SortKey = "date" | "legCount" | "confidence" | "combinedOdds";
const DEFAULT_LEG = "all", DEFAULT_CONF = "0", DEFAULT_RANGE = "all";

export default function ParlaysHistoryPage() {
  const [legFilter, setLegFilter] = useState(DEFAULT_LEG);
  const [minConfidence, setMinConfidence] = useState(DEFAULT_CONF);
  const [rangeFilter, setRangeFilter] = useState(DEFAULT_RANGE); // "7" | "14" | "30" | "all"
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // Which row is expanded (only one at a time for a clean layout).
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Anchor date-range math to the app's "today" so it lines up with the data.
  const today = useUiStore((s) => s.selectedDate);

  // Map server-side controls → API filter object (memoized so the query key
  // is stable). Search + sort are applied client-side over the result set.
  const filters = useMemo<HistoryFilters>(() => {
    const f: HistoryFilters = {};
    if (legFilter !== "all") f.legCount = Number(legFilter) as 2 | 3 | 4;
    if (Number(minConfidence) > 0) f.minConfidence = Number(minConfidence);
    if (rangeFilter !== "all") f.sinceDate = minusDays(today, Number(rangeFilter));
    return f;
  }, [legFilter, minConfidence, rangeFilter, today]);

  const { data, isLoading, isError, refetch, isPlaceholderData } = useHistory(filters);
  const summary = data?.summary;

  const hasActiveFilters =
    legFilter !== DEFAULT_LEG || minConfidence !== DEFAULT_CONF ||
    rangeFilter !== DEFAULT_RANGE || search.trim() !== "";

  const clearFilters = () => {
    setLegFilter(DEFAULT_LEG); setMinConfidence(DEFAULT_CONF);
    setRangeFilter(DEFAULT_RANGE); setSearch("");
  };

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "date" ? "desc" : "desc"); }
  };

  // Client-side: filter by player-name search, then sort.
  const parlays = useMemo(() => {
    let rows = data?.parlays ?? [];
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((p) => p.playersLabel.toLowerCase().includes(q));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return cmp * dir;
    });
  }, [data, search, sortKey, sortDir]);

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
          <FilterField label="Date range">
            <Select
              value={rangeFilter}
              onChange={(e) => setRangeFilter(e.target.value)}
              options={[
                { value: "all", label: "All time" },
                { value: "7", label: "Last 7 days" },
                { value: "14", label: "Last 14 days" },
                { value: "30", label: "Last 30 days" },
              ]}
            />
          </FilterField>
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
          <FilterField label="Search player">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Judge"
              className="h-9 w-44 rounded-md border border-input bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FilterField>

          {/* count + clear, pushed to the right */}
          <div className="ml-auto flex items-center gap-3 self-end">
            <span className="text-xs text-muted-foreground">
              {isLoading ? "Loading…" : `${parlays.length} ${parlays.length === 1 ? "parlay" : "parlays"}`}
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-secondary"
              >
                Clear filters
              </button>
            )}
          </div>
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
                <TableHead className="w-8" />
                <SortHead label="Date" col="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHead label="Legs" col="legCount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <TableHead>Players</TableHead>
                <SortHead label="Confidence" col="confidence" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHead label="Odds" col="combinedOdds" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
                <TableHead className="text-right">Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : parlays.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No parlays match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                parlays.map((h) => (
                  <HistoryRow
                    key={h.id}
                    parlay={h}
                    expanded={expandedId === h.id}
                    onToggle={() => setExpandedId((cur) => (cur === h.id ? null : h.id))}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Click any row to see the per-leg breakdown. Summary stats reflect the current filters.
      </p>
    </PageContainer>
  );
}

function HistoryRow({
  parlay, expanded, onToggle,
}: {
  parlay: StoredParlay; expanded: boolean; onToggle: () => void;
}) {
  const o = OUTCOME_BADGE[parlay.outcome];
  return (
    <Fragment>
      <TableRow
        onClick={onToggle}
        className="cursor-pointer"
        aria-expanded={expanded}
      >
        <TableCell className="text-muted-foreground">
          <span className={cn("inline-block transition-transform", expanded && "rotate-90")} aria-hidden>›</span>
        </TableCell>
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

      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="bg-secondary/40 p-0">
            <OutcomeDetail parlay={parlay} />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

function OutcomeDetail({ parlay }: { parlay: StoredParlay }) {
  const hitProbPct = (parlay.combinedProbability * 100).toFixed(1);
  return (
    <div className="px-5 py-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        {/* per-leg breakdown */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Leg results
          </div>
          <div className="space-y-1">
            {parlay.legResults.map((leg) => {
              const status =
                leg.hitHr === null ? "pending" : leg.hitHr ? "hit" : "miss";
              const s = OUTCOME_BADGE[status];
              return (
                <div
                  key={leg.playerId}
                  className="flex items-center justify-between rounded-md bg-card px-3 py-2"
                >
                  <Link
                    href={`/player/${leg.playerId}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {leg.fullName}
                  </Link>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {leg.hitHr === null ? "Awaiting result" : leg.hitHr ? "Homered" : "No HR"}
                    </span>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* meta */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:block md:space-y-2">
          <Meta label="Hit probability" value={`${hitProbPct}%`} />
          <Meta label="Recommended" value={fmtDateTime(parlay.createdAt)} />
          <Meta label="Settled" value={parlay.settledAt ? fmtDateTime(parlay.settledAt) : "—"} />
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="stat-figure text-sm font-medium">{value}</div>
    </div>
  );
}

function fmtDateTime(iso: string): string {
  // e.g. "Jun 1, 3:00 PM"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function SortHead({
  label, col, sortKey, sortDir, onSort, className,
}: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = sortKey === col;
  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(col)}
        className={cn("inline-flex items-center gap-1 transition-colors hover:text-foreground", active && "text-foreground")}
      >
        {label}
        <span className="text-[10px]">{active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </TableHead>
  );
}
