// Park factors: ballpark-level HR propensity. Sourced from Statcast park
// factors leaderboards or a static-but-updatable JSON we ship in /data.
// Values >100 favor HR; <100 suppress.

import type { VenueId } from "./common";

export interface ParkFactors {
  venueId: VenueId;
  venueName: string;
  // Compass heading (deg) of straight-out CF from home plate. Used to project
  // the wind vector onto the "to CF" axis when computing windOutwardComponent.
  cfBearingDeg: number;
  latitude: number;
  longitude: number;
  hrIndex: number;          // overall, league avg = 100
  hrIndexVsLhb: number;     // for LH batters
  hrIndexVsRhb: number;     // for RH batters
  altitudeFeet: number;     // Coors at ~5,200 ft → carry boost
}

// Display shape for the ballparks table. Derived from ParkFactors — only
// fields we actually have. `orientation` is a human label computed from
// cfBearingDeg (e.g. "CF faces NNE"); we deliberately do NOT invent stadium
// dimensions or prevailing-wind data we don't have.
export interface ParkView {
  venueId: number;
  venueName: string;
  teamAbbr: string;
  hrIndex: number;
  hrIndexLhb: number;
  hrIndexRhb: number;
  altitudeFeet: number;
  cfBearingDeg: number;
  orientation: string;      // compass label for CF heading
}
