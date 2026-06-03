// Typed shapes for the MLB Stats API responses we actually consume.
// Source: https://statsapi.mlb.com — undocumented; we model only the fields
// we read so changes elsewhere in the payload don't break compile.

import type { GameId, ISODateTime, PlayerId, TeamId, VenueId, Handedness, PitcherHandedness } from "./common";

export interface MlbScheduleResponse {
  dates: Array<{
    date: string;
    games: MlbScheduleGame[];
  }>;
}

export interface MlbScheduleGame {
  gamePk: number;            // → GameId
  gameDate: ISODateTime;
  status: { abstractGameState: "Preview" | "Live" | "Final" };
  teams: {
    away: { team: { id: number; name: string }; probablePitcher?: { id: number; fullName: string } };
    home: { team: { id: number; name: string }; probablePitcher?: { id: number; fullName: string } };
  };
  venue: { id: number; name: string };
}

export interface MlbBoxscoreResponse {
  teams: {
    away: MlbBoxscoreTeam;
    home: MlbBoxscoreTeam;
  };
}

export interface MlbBoxscoreTeam {
  team: { id: number; name: string };
  // `battingOrder` is an array of player IDs (as strings) in lineup order;
  // populated only after the official lineup is posted.
  battingOrder?: string[];
  players: Record<string, MlbBoxscorePlayer>;   // keyed "ID<playerId>"
}

export interface MlbBoxscorePlayer {
  person: { id: number; fullName: string };
  position: { abbreviation: string };
  batSide?: { code: Handedness };
  pitchHand?: { code: PitcherHandedness };
  stats?: { batting?: Record<string, unknown>; pitching?: Record<string, unknown> };
}

export interface MlbPlayerStatsResponse {
  stats: Array<{
    type: { displayName: string };       // e.g. "byDateRange", "season"
    splits: Array<{
      season?: string;
      stat: {
        gamesPlayed?: number;
        plateAppearances?: number;
        atBats?: number;
        homeRuns?: number;
        hits?: number;
        slg?: string;       // MLB returns rate stats as strings, e.g. ".512"
        ops?: string;
        babip?: string;
      };
    }>;
  }>;
}

// ─── Normalized internal shapes (post-translation) ──────────────────

export interface ScheduledGame {
  gameId: GameId;
  gameDate: ISODateTime;
  state: "Preview" | "Live" | "Final";
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeTeamName: string;
  awayTeamName: string;
  venueId: VenueId;
  venueName: string;
  homeProbablePitcherId?: PlayerId;
  awayProbablePitcherId?: PlayerId;
}

export interface LineupSlot {
  playerId: PlayerId;
  fullName: string;
  battingOrder: number;          // 1–9
  positionAbbr: string;
  batSide: Handedness;
}

export interface ConfirmedLineup {
  gameId: GameId;
  teamId: TeamId;
  isHome: boolean;
  slots: LineupSlot[];
  confirmed: boolean;            // false → projected from yesterday's lineup
  opposingPitcherId?: PlayerId;
  opposingPitcherName?: string;
  opposingPitcherHand?: PitcherHandedness;
}

export interface BattingSplit {
  windowDays: number | "season"; // 7 | 14 | 30 | "season"
  plateAppearances: number;
  atBats: number;
  homeRuns: number;
  homeRunRatePerPA: number;      // HR / PA
  slg: number;
  ops: number;
}
