// Single source of truth for confidence → color/label mapping. Every
// component that renders a confidence value (badge, ring, bar) reads from
// here so the thresholds stay consistent across the app.

export type ConfidenceTier = "high" | "med" | "low";

export const CONFIDENCE_THRESHOLDS = {
  high: 70, // score >= 70 → green
  med: 50,  // score >= 50 → amber, else red
} as const;

export function confidenceTier(score: number): ConfidenceTier {
  if (score >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.med) return "med";
  return "low";
}

export const TIER_LABEL: Record<ConfidenceTier, string> = {
  high: "High confidence",
  med: "Medium confidence",
  low: "Low confidence",
};

// Tailwind class fragments per tier. Kept as full literal strings (not
// interpolated) so Tailwind's content scanner can see and keep them.
export const TIER_CLASSES: Record<
  ConfidenceTier,
  { text: string; bg: string; bgSoft: string; border: string; ring: string; hex: string }
> = {
  high: {
    text: "text-confidence-high",
    bg: "bg-confidence-high",
    bgSoft: "bg-confidence-high/10",
    border: "border-confidence-high/30",
    ring: "stroke-confidence-high",
    hex: "#00C853",
  },
  med: {
    text: "text-confidence-med",
    bg: "bg-confidence-med",
    bgSoft: "bg-confidence-med/10",
    border: "border-confidence-med/30",
    ring: "stroke-confidence-med",
    hex: "#FFB300",
  },
  low: {
    text: "text-confidence-low",
    bg: "bg-confidence-low",
    bgSoft: "bg-confidence-low/10",
    border: "border-confidence-low/30",
    ring: "stroke-confidence-low",
    hex: "#E53935",
  },
};

/** American-odds formatter for display (e.g. +450, -120). */
export function formatAmericanOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/** Convert a 0–1 probability to American odds (fair, no vig). */
export function probabilityToAmericanOdds(p: number): number {
  const clamped = Math.min(0.99, Math.max(0.01, p));
  if (clamped >= 0.5) return Math.round((-clamped / (1 - clamped)) * 100);
  return Math.round(((1 - clamped) / clamped) * 100);
}
