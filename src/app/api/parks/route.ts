// GET /api/parks → all known ballparks as display rows for the ballparks
// table. Pure static data (park factors + venue→team map), so it's cheap and
// fully cacheable at the edge.

import { listKnownVenues } from "@/lib/services/parkFactors";
import venueTeam from "@/data/venueTeam.json";
import type { ParkView } from "@/types";

export const dynamic = "force-static";

// Compass label from a bearing in degrees (0 = N).
function compass(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[i] ?? "N";
}

export function GET() {
  const teamMap = venueTeam as Record<string, string>;
  const parks: ParkView[] = listKnownVenues().map((p) => ({
    venueId: p.venueId,
    venueName: p.venueName,
    teamAbbr: teamMap[String(p.venueId)] ?? "—",
    hrIndex: p.hrIndex,
    hrIndexLhb: p.hrIndexVsLhb,
    hrIndexRhb: p.hrIndexVsRhb,
    altitudeFeet: p.altitudeFeet,
    cfBearingDeg: p.cfBearingDeg,
    orientation: `CF faces ${compass(p.cfBearingDeg)}`,
  }));
  // Default sort: most HR-friendly first.
  parks.sort((a, b) => b.hrIndex - a.hrIndex);
  return Response.json({ parks });
}
