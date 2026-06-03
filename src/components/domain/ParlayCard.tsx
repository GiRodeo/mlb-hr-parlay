// Full parlay display: confidence badge, combined odds, and a per-leg
// breakdown. Used in the dashboard's "Today's Parlays" section.
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { PlayerAvatar } from "./PlayerAvatar";
import { cn } from "@/lib/utils/cn";
import { formatAmericanOdds } from "@/lib/utils/confidence";
import type { Parlay } from "@/types";

export interface ParlayCardProps {
  parlay: Parlay;
  /** Highlighted hero styling for the top recommended parlay. */
  featured?: boolean;
  className?: string;
}

export function ParlayCard({ parlay, featured = false, className }: ParlayCardProps) {
  const legCount = parlay.legs.length;
  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        featured && "border-navy/20 ring-1 ring-navy/10",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-navy px-2 py-0.5 text-xs font-bold text-navy-foreground">
              {legCount}-LEG
            </span>
            {featured && (
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                Top pick
              </span>
            )}
          </div>
          <ConfidenceBadge score={parlay.confidence} />
        </div>

        {/* combined odds + probability */}
        <div className="mt-2 flex items-end justify-between">
          <div>
            <div className="stat-figure text-2xl font-bold text-navy">
              {formatAmericanOdds(parlay.combinedOdds)}
            </div>
            <div className="text-xs text-muted-foreground">Combined odds</div>
          </div>
          <div className="text-right">
            <div className="stat-figure text-sm font-semibold">
              {(parlay.combinedProbability * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Hit probability</div>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex flex-1 flex-col pt-3">
        <div className="space-y-1">
          {parlay.legs.map((leg) => (
            <Link
              key={String(leg.playerId)}
              href={`/player/${leg.playerId}`}
              className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-secondary"
            >
              <PlayerAvatar name={leg.fullName} size={28} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{leg.fullName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {leg.teamAbbr} · {leg.matchup}
                </div>
              </div>
              {/* Per-leg HR probability + fair odds, so the parlay's combined
                  probability (the product of these) is transparent. */}
              <div className="flex flex-col items-end leading-tight">
                <span className="stat-figure text-xs font-semibold">
                  {(leg.impliedHrProbability * 100).toFixed(1)}% HR
                </span>
                <span className="stat-figure text-[11px] text-muted-foreground">
                  {formatAmericanOdds(leg.americanOdds)}
                </span>
              </div>
              <ConfidenceBadge score={leg.composite} showLabel={false} size="sm" />
            </Link>
          ))}
        </div>

        {/* Make the multiplication explicit: leg1% × leg2% × … = combined */}
        <div className="mt-2 rounded-md bg-secondary/50 px-2.5 py-1.5 text-center text-[11px] text-muted-foreground">
          {parlay.legs.map((l) => `${(l.impliedHrProbability * 100).toFixed(1)}%`).join(" × ")}
          {" = "}
          <span className="stat-figure font-semibold text-foreground">
            {(parlay.combinedProbability * 100).toFixed(1)}%
          </span>{" "}
          combined
        </div>

        <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          {parlay.rationale}
        </p>
      </CardContent>
    </Card>
  );
}
