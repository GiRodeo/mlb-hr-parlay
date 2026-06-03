// Team reference lookup (abbreviation + display name by MLB teamId). MLB team
// IDs are stable, so a static map is appropriate. Used to build the display
// fields (team abbr, "vs BOS" matchup strings) on scored players.

import raw from "@/data/teams.json";

interface TeamRef { abbr: string; name: string }
const TABLE = raw as Record<string, TeamRef>;

export function getTeam(teamId: number): TeamRef {
  return TABLE[String(teamId)] ?? { abbr: "UNK", name: `Team ${teamId}` };
}

export function teamAbbr(teamId: number): string {
  return getTeam(teamId).abbr;
}
