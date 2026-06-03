// Large circular confidence gauge (0–100) for the player profile. Pure SVG,
// no chart lib needed. Color follows the shared confidence tier.
import { confidenceTier, TIER_CLASSES, TIER_LABEL } from "@/lib/utils/confidence";
import { cn } from "@/lib/utils/cn";

export interface ConfidenceRingProps {
  score: number;          // 0–100
  size?: number;          // px diameter
  strokeWidth?: number;
  label?: string;         // override the tier label
  className?: string;
}

export function ConfidenceRing({
  score,
  size = 160,
  strokeWidth = 12,
  label,
  className,
}: ConfidenceRingProps) {
  const tier = confidenceTier(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dashOffset = circumference * (1 - pct);
  const color = TIER_CLASSES[tier].hex;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* value arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-figure text-3xl font-bold leading-none" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label ?? TIER_LABEL[tier]}
        </span>
      </div>
    </div>
  );
}
