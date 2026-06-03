// Color-coded confidence pill. Green ≥70, amber ≥50, red below.
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { confidenceTier, TIER_LABEL, type ConfidenceTier } from "@/lib/utils/confidence";

export interface ConfidenceBadgeProps {
  /** 0–100 confidence/composite score. */
  score: number;
  /** Soft (tinted bg) vs solid fill. */
  variant?: "solid" | "soft";
  /** Show the numeric score alongside the label. */
  showScore?: boolean;
  /** Show the full "High confidence" label vs just a dot + score. */
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ConfidenceBadge({
  score,
  variant = "soft",
  showScore = true,
  showLabel = true,
  size = "md",
  className,
}: ConfidenceBadgeProps) {
  const tier = confidenceTier(score);
  const badgeVariant = (variant === "solid" ? tier : `${tier}-soft`) as
    | ConfidenceTier
    | `${ConfidenceTier}-soft`;

  return (
    <Badge
      variant={badgeVariant}
      className={cn(size === "sm" && "px-2 py-0 text-[10px]", "gap-1.5", className)}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          variant === "soft"
            ? tier === "high" ? "bg-confidence-high" : tier === "med" ? "bg-confidence-med" : "bg-confidence-low"
            : "bg-white/80",
        )}
        aria-hidden
      />
      {showLabel && <span>{TIER_LABEL[tier]}</span>}
      {showScore && <span className="stat-figure font-bold">{Math.round(score)}</span>}
    </Badge>
  );
}
