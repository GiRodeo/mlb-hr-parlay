// Visual HR park-factor indicator. Index 100 = neutral; >100 favors HRs.
// Renders a compact pill with a directional arrow + tier color.
import { cn } from "@/lib/utils/cn";

export interface ParkFactorBadgeProps {
  index: number;        // 100 = neutral
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}

function tierFor(index: number): { color: string; bg: string; label: string } {
  if (index >= 115) return { color: "text-confidence-high", bg: "bg-confidence-high/10", label: "Hitter-friendly" };
  if (index >= 105) return { color: "text-confidence-high", bg: "bg-confidence-high/10", label: "Favorable" };
  if (index > 95) return { color: "text-muted-foreground", bg: "bg-muted", label: "Neutral" };
  if (index > 85) return { color: "text-confidence-med", bg: "bg-confidence-med/10", label: "Suppressed" };
  return { color: "text-confidence-low", bg: "bg-confidence-low/10", label: "Pitcher-friendly" };
}

export function ParkFactorBadge({ index, size = "md", showValue = true, className }: ParkFactorBadgeProps) {
  const t = tierFor(index);
  const arrow = index >= 105 ? "▲" : index <= 95 ? "▼" : "▬";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-semibold",
        t.bg, t.color,
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
        className,
      )}
      title={`Park HR index ${index} — ${t.label}`}
    >
      <span aria-hidden>{arrow}</span>
      {showValue && <span className="stat-figure">{index}</span>}
    </span>
  );
}
