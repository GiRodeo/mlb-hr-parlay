// Compact player card. Two layouts:
//   - "grid"   → full card for the Best Bets grid (default)
//   - "compact"→ slim row used inside ParlayCard leg breakdowns
//
// Consumes the real `Score` domain type — `score.display` carries all the
// presentational fields (team, matchup, headline statcast, park index).
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ParkFactorBadge } from "./ParkFactorBadge";
import { PlayerAvatar } from "./PlayerAvatar";
import { cn } from "@/lib/utils/cn";
import type { Score } from "@/types";

export interface PlayerCardProps {
  player: Score;
  variant?: "grid" | "compact";
  /** Optional rank number shown as a chip (used in Best Bets). */
  rank?: number;
  className?: string;
}

export function PlayerCard({ player, variant = "grid", rank, className }: PlayerCardProps) {
  const d = player.display;
  const id = player.playerId as unknown as number;

  if (variant === "compact") {
    return (
      <Link
        href={`/player/${id}`}
        className={cn(
          "flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary",
          className,
        )}
      >
        <PlayerAvatar name={player.fullName} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{player.fullName}</div>
          <div className="text-xs text-muted-foreground">
            {d.teamAbbr} · {d.position}
          </div>
        </div>
        <ConfidenceBadge score={player.composite} showLabel={false} size="sm" />
      </Link>
    );
  }

  return (
    <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", className)}>
      {rank != null && (
        <span className="absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-bold text-navy-foreground">
          {rank}
        </span>
      )}
      <Link href={`/player/${id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <PlayerAvatar name={player.fullName} size={48} className={rank != null ? "ml-6" : ""} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold leading-tight">{player.fullName}</div>
            <div className="text-xs text-muted-foreground">
              {d.teamAbbr} · {d.position} · {d.batSide}HB
            </div>
          </div>
          <ConfidenceBadge score={player.composite} showLabel={false} />
        </div>

        {/* matchup line */}
        <div className="mt-3 flex items-center justify-between rounded-md bg-secondary/60 px-2.5 py-2 text-xs">
          <span className="text-muted-foreground">
            vs <span className="font-medium text-foreground">{d.opposingPitcher.name}</span> ({d.opposingPitcher.hand}HP)
          </span>
          <ParkFactorBadge index={d.parkHrIndex} size="sm" />
        </div>

        {/* key stats row */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Barrel%" value={d.barrelRate.toFixed(1)} />
          <Stat label="EV" value={d.exitVelo.toFixed(1)} />
          <Stat label="xSLG" value={d.xSlg.toFixed(3)} />
        </div>
      </Link>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 py-1.5">
      <div className="stat-figure text-sm font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
