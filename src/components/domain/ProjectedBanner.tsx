// Shown when a slate is built from PROJECTED (not yet confirmed) lineups —
// e.g. looking ahead to tomorrow. Keeps the app honest: these picks are
// estimates based on recent lineups, not official cards.
import { cn } from "@/lib/utils/cn";

export function ProjectedBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-confidence-med/40 bg-confidence-med/10 px-4 py-3",
        className,
      )}
      role="status"
    >
      <span className="text-lg leading-none" aria-hidden>⏳</span>
      <div className="text-sm">
        <span className="font-semibold text-foreground">Projected lineups.</span>{" "}
        <span className="text-muted-foreground">
          Official lineups for this date aren&apos;t posted yet. These picks are
          based on each team&apos;s most recent lineup and probable starters, and
          will sharpen once cards are confirmed (usually a few hours before first pitch).
        </span>
      </div>
    </div>
  );
}
