// Shared primitive types used across services and engines.

export type Handedness = "L" | "R" | "S"; // S = switch hitter
export type PitcherHandedness = "L" | "R";
export type ISODate = string;             // YYYY-MM-DD
export type ISODateTime = string;         // RFC3339

// Branded ID types prevent accidentally passing a teamId where a playerId is expected.
export type Brand<T, B> = T & { readonly __brand: B };
export type PlayerId = Brand<number, "PlayerId">;
export type TeamId = Brand<number, "TeamId">;
export type GameId = Brand<number, "GameId">;
export type VenueId = Brand<number, "VenueId">;

export const asPlayerId = (n: number) => n as PlayerId;
export const asTeamId = (n: number) => n as TeamId;
export const asGameId = (n: number) => n as GameId;
export const asVenueId = (n: number) => n as VenueId;
