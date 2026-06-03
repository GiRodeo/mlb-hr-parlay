// Park Factor Index — wired to /api/parks. Sortable table of all parks.
// We render only data we actually have (HR indices, altitude, CF orientation)
// — no fabricated dimensions or prevailing-wind claims.
"use client";
import { useState, useMemo } from "react";
import { PageContainer, SectionHeading } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ParkFactorBadge } from "@/components/domain/ParkFactorBadge";
import { FieldDiagram } from "@/components/domain/FieldDiagram";
import { CardGridSkeleton, ErrorState, EmptyState } from "@/components/ui/states";
import { useParks } from "@/hooks/useParks";
import { cn } from "@/lib/utils/cn";
import type { ParkView } from "@/types";

type SortKey = "venueName" | "hrIndex" | "hrIndexLhb" | "hrIndexRhb" | "altitudeFeet";

export default function BallparksPage() {
  const { data, isLoading, isError, refetch } = useParks();
  const [sortKey, setSortKey] = useState<SortKey>("hrIndex");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...(data?.parks ?? [])];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data, sortKey, dir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setDir((dd) => (dd === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setDir(key === "venueName" ? "asc" : "desc"); }
  };

  return (
    <PageContainer>
      <SectionHeading
        title="Park Factor Index"
        subtitle="Home-run propensity for all MLB ballparks. 100 = league neutral."
      />

      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : isError ? (
        <ErrorState message="Couldn't load park factors." onRetry={() => refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState title="No park data" />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <SortHead label="Ballpark" active={sortKey === "venueName"} dir={dir} onClick={() => toggleSort("venueName")} />
                <SortHead label="HR Factor" active={sortKey === "hrIndex"} dir={dir} onClick={() => toggleSort("hrIndex")} className="text-right" />
                <SortHead label="LHH" active={sortKey === "hrIndexLhb"} dir={dir} onClick={() => toggleSort("hrIndexLhb")} className="text-right" />
                <SortHead label="RHH" active={sortKey === "hrIndexRhb"} dir={dir} onClick={() => toggleSort("hrIndexRhb")} className="text-right" />
                <TableHead>Orientation</TableHead>
                <SortHead label="Altitude" active={sortKey === "altitudeFeet"} dir={dir} onClick={() => toggleSort("altitudeFeet")} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((park) => (
                <ParkRow key={park.venueId} park={park} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        HR factors are seasonal estimates (league avg = 100). Orientation is the compass
        heading from home plate to center field.
      </p>
    </PageContainer>
  );
}

function ParkRow({ park }: { park: ParkView }) {
  return (
    <TableRow>
      <TableCell>
        <FieldDiagram size={36} />
      </TableCell>
      <TableCell>
        <div className="font-medium">{park.venueName}</div>
        <div className="text-xs text-muted-foreground">{park.teamAbbr}</div>
      </TableCell>
      <TableCell className="text-right">
        <ParkFactorBadge index={park.hrIndex} />
      </TableCell>
      <TableCell className="stat-figure text-right">{park.hrIndexLhb}</TableCell>
      <TableCell className="stat-figure text-right">{park.hrIndexRhb}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{park.orientation}</TableCell>
      <TableCell className="stat-figure text-right">{park.altitudeFeet.toLocaleString()} ft</TableCell>
    </TableRow>
  );
}

function SortHead({
  label, active, dir, onClick, className,
}: {
  label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        onClick={onClick}
        className={cn("inline-flex items-center gap-1 transition-colors hover:text-foreground", active && "text-foreground")}
      >
        {label}
        <span className="text-[10px]">{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </TableHead>
  );
}
