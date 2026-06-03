// "Why this score" breakdown. Visualizes how each feature contributed to a
// player's composite. Uses the engine's own outputs:
//   - subscores[k]      → the 0–100 strength of feature k (bar fill)
//   - contributions[k]  → weighted points feature k added to the composite
// Sorted by contribution so the biggest drivers read first.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confidenceTier, TIER_CLASSES } from "@/lib/utils/confidence";
import { FEATURE_META } from "@/lib/scoring/featureMeta";
import { cn } from "@/lib/utils/cn";
import type { Score } from "@/types";

export function ScoreBreakdown({ score }: { score: Score }) {
  // Pair each feature with its meta, subscore, and contribution, then sort
  // by contribution descending (biggest driver of the composite first).
  const rows = FEATURE_META.map((m) => ({
    ...m,
    subscore: score.subscores[m.key],
    contribution: score.contributions[m.key],
  })).sort((a, b) => b.contribution - a.contribution);

  const totalContribution = rows.reduce((s, r) => s + r.contribution, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          Why this score
          <span className="text-xs font-normal text-muted-foreground">
            composite <span className="stat-figure font-bold text-foreground">{Math.round(score.composite)}</span>/100
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {rows.map((r) => (
          <FeatureRow
            key={r.key}
            label={r.label}
            description={r.description}
            subscore={r.subscore}
            contribution={r.contribution}
            sharePct={totalContribution > 0 ? (r.contribution / totalContribution) * 100 : 0}
          />
        ))}
        <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Each feature is scored 0–100, then weighted and summed into the composite.
          Bars show the feature&apos;s strength; the points show how much it added.
        </p>
      </CardContent>
    </Card>
  );
}

function FeatureRow({
  label, description, subscore, contribution, sharePct,
}: {
  label: string; description: string; subscore: number; contribution: number; sharePct: number;
}) {
  const tier = confidenceTier(subscore);
  const barColor =
    tier === "high" ? "bg-confidence-high" : tier === "med" ? "bg-confidence-med" : "bg-confidence-low";

  return (
    <div className="group">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium" title={description}>{label}</span>
        <span className="flex items-baseline gap-2 text-xs text-muted-foreground">
          <span className="stat-figure">{Math.round(subscore)}</span>
          <span className="stat-figure font-semibold text-foreground">+{contribution.toFixed(1)}</span>
        </span>
      </div>
      {/* subscore strength bar */}
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.max(0, Math.min(100, subscore))}%` }} />
      </div>
      {/* tiny description + share of composite */}
      <div className="mt-0.5 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{description}</span>
        <span className="text-[10px] text-muted-foreground">{sharePct.toFixed(0)}% of total</span>
      </div>
    </div>
  );
}
