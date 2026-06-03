// Horizontal bar comparing a player stat to league average. The fill width
// scales the value within a sensible domain; a tick marks league average so
// "above/below average" reads instantly.
import { cn } from "@/lib/utils/cn";

export interface StatBarProps {
  label: string;
  value: number;
  leagueAvg: number;
  /** Upper bound for the bar scale. Defaults to 1.6× the larger of value/avg. */
  max?: number;
  /** Formatting for the printed figure. */
  format?: (n: number) => string;
  /** Unit suffix appended to the figure (e.g. "%", " mph"). */
  unit?: string;
  /** Higher value = better (green) vs worse. Drives fill color. */
  higherIsBetter?: boolean;
  className?: string;
}

export function StatBar({
  label,
  value,
  leagueAvg,
  max,
  format = (n) => n.toFixed(1),
  unit = "",
  higherIsBetter = true,
  className,
}: StatBarProps) {
  const domainMax = max ?? (Math.max(value, leagueAvg) * 1.6 || 1);
  const valuePct = Math.min(100, (value / domainMax) * 100);
  const avgPct = Math.min(100, (leagueAvg / domainMax) * 100);

  const beatsAvg = higherIsBetter ? value >= leagueAvg : value <= leagueAvg;
  const fillColor = beatsAvg ? "bg-confidence-high" : "bg-muted-foreground/50";

  const delta = value - leagueAvg;
  const deltaPct = leagueAvg !== 0 ? (delta / leagueAvg) * 100 : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="stat-figure text-sm font-semibold">
          {format(value)}{unit}
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", fillColor)} style={{ width: `${valuePct}%` }} />
        {/* league-average tick */}
        <div
          className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-foreground/70"
          style={{ left: `${avgPct}%` }}
          title={`League avg: ${format(leagueAvg)}${unit}`}
          aria-hidden
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>
          {beatsAvg ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(0)}% vs avg
        </span>
        <span>lg {format(leagueAvg)}{unit}</span>
      </div>
    </div>
  );
}
