// Dashboard sidebar: park factors (live) + a weather-impact illustration.
//
// Park factors come from /api/parks. The weather block is static/illustrative:
// there is no "today's weather per venue" endpoint yet (Open-Meteo is wired in
// the scoring path but not surfaced here), so it's clearly labeled rather than
// faked as live. Wire it to a future /api/weather?date= endpoint to make real.
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParkFactorBadge } from "./ParkFactorBadge";
import { Skeleton } from "@/components/ui/states";
import { useParks } from "@/hooks/useParks";

interface WeatherRow {
  venue: string;
  tempF: number;
  wind: string;
  impact: "boost" | "neutral" | "suppress";
}

// Illustrative only — see file header.
const WEATHER: WeatherRow[] = [
  { venue: "Coors Field", tempF: 88, wind: "9 mph out to LF", impact: "boost" },
  { venue: "Yankee Stadium", tempF: 81, wind: "11 mph out to RF", impact: "boost" },
  { venue: "Citizens Bank Park", tempF: 76, wind: "6 mph variable", impact: "neutral" },
  { venue: "Citi Field", tempF: 72, wind: "8 mph in from CF", impact: "suppress" },
];

const IMPACT_STYLE: Record<WeatherRow["impact"], { dot: string; label: string }> = {
  boost: { dot: "bg-confidence-high", label: "Boost" },
  neutral: { dot: "bg-muted-foreground/50", label: "Neutral" },
  suppress: { dot: "bg-confidence-low", label: "Suppress" },
};

export function WeatherParkSidebar() {
  const { data, isLoading } = useParks();
  const topParks = (data?.parks ?? []).slice(0, 6);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            Weather Impact
            <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
              Illustrative
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {WEATHER.map((w) => {
            const s = IMPACT_STYLE[w.impact];
            return (
              <div key={w.venue} className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
                <div>
                  <div className="text-sm font-medium">{w.venue}</div>
                  <div className="text-xs text-muted-foreground">{w.tempF}°F · {w.wind}</div>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
                  {s.label}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Top HR Parks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)
            : topParks.map((p) => (
                <div key={p.venueId} className="flex items-center justify-between py-1.5">
                  <div className="text-sm">
                    <span className="font-medium">{p.teamAbbr}</span>
                    <span className="ml-2 text-muted-foreground">{p.venueName}</span>
                  </div>
                  <ParkFactorBadge index={p.hrIndex} size="sm" />
                </div>
              ))}
        </CardContent>
      </Card>
    </div>
  );
}
