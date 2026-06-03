// Park factor service. Reads from src/data/parkFactors.json — a static-but-
// editable file. Refresh once a season from Statcast park-factors leaderboard
// (or programmatically: TODO add a script under scripts/ to regenerate).

import raw from "@/data/parkFactors.json";
import { asVenueId, type ParkFactors, type VenueId } from "@/types";

// The JSON is { _meta, parks: [...] }; we only consume `parks`.
type RawPark = Omit<ParkFactors, "venueId"> & { venueId: number };
const PARKS = (raw as { parks: RawPark[] }).parks;

// Index by venueId so lookup in the scoring path is O(1).
const _index: Map<VenueId, ParkFactors> = (() => {
  const m = new Map<VenueId, ParkFactors>();
  for (const r of PARKS) {
    const { venueId, ...rest } = r;
    const vid = asVenueId(venueId);
    m.set(vid, { ...rest, venueId: vid });
  }
  return m;
})();

export function getParkFactors(venueId: number): ParkFactors {
  const vid = asVenueId(venueId);
  const hit = _index.get(vid);
  if (hit) return hit;
  // Sensible neutral fallback so unknown venues never crash scoring.
  return {
    venueId: vid,
    venueName: `Unknown venue ${venueId}`,
    cfBearingDeg: 0,
    latitude: 0,
    longitude: 0,
    hrIndex: 100,
    hrIndexVsLhb: 100,
    hrIndexVsRhb: 100,
    altitudeFeet: 0,
  };
}

export function listKnownVenues(): ParkFactors[] {
  return Array.from(_index.values());
}
