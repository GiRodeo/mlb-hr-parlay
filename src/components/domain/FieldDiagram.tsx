// Minimal baseball field diagram placeholder — a wedge with the outfield
// fence. Used as a per-row visual on the ballparks table. Pure SVG.
// `dimensions` ("LF-CF-RF") subtly skews the fence to hint at park shape.
import { cn } from "@/lib/utils/cn";

export interface FieldDiagramProps {
  dimensions?: string; // "330-400-325"
  size?: number;
  className?: string;
}

export function FieldDiagram({ dimensions, size = 40, className }: FieldDiagramProps) {
  const [lf, cf, rf] = (dimensions ?? "330-400-330").split("-").map(Number);
  // Normalize depths to a 0–1 range to nudge the fence arc control points.
  const norm = (d: number) => Math.max(0, Math.min(1, (d - 300) / 130));
  const lfN = norm(lf ?? 330);
  const cfN = norm(cf ?? 400);
  const rfN = norm(rf ?? 330);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={cn("text-navy", className)}
      aria-hidden
    >
      {/* infield wedge */}
      <path d="M20 36 L4 18 L36 18 Z" fill="hsl(var(--muted))" />
      {/* outfield fence arc, skewed by dimensions */}
      <path
        d={`M4 ${18 - lfN * 3} Q20 ${4 - cfN * 3} 36 ${18 - rfN * 3}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* foul lines */}
      <path d="M20 36 L4 16 M20 36 L36 16" stroke="currentColor" strokeWidth={1} opacity={0.4} />
      {/* home plate */}
      <circle cx="20" cy="36" r="1.5" fill="currentColor" />
    </svg>
  );
}
