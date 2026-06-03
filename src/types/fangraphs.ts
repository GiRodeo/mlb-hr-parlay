// FanGraphs leaderboard rows. Their public JSON has stable enough column
// names but values are sometimes strings; we coerce in the service layer.

import type { PlayerId } from "./common";

export interface FangraphsRawPitcherRow {
  playerid: number | string;
  Name: string;
  Team: string;
  IP: number | string;
  "HR/9": number | string;
  FIP: number | string;
  xFIP: number | string;
  "K/9"?: number | string;
  "BB/9"?: number | string;
  // Savant-derived fields available on FanGraphs leaderboards too:
  "Barrel%"?: number | string;
  "HardHit%"?: number | string;
}

export interface PitcherAdvanced {
  playerId: PlayerId;
  ip: number;
  hr9: number;             // home runs per 9 innings
  fip: number;
  xFip: number;
  k9?: number;
  bb9?: number;
  // Optional Savant overlap; if present we prefer Savant's value in scoring.
  barrelPctAllowed?: number;
  hardHitPctAllowed?: number;
}
