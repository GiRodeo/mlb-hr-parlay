// Mock fixtures for UI development. These mirror the real domain types so
// swapping in live data later is a drop-in change. NO real data is wired up
// yet — every page renders from these.
//
// View-model types live here too (slightly flattened/denormalized vs the
// API types) because the UI cares about display shape, not wire shape.

export interface MockPlayer {
  id: number;
  name: string;
  team: string;
  teamAbbr: string;
  position: string;
  batSide: "L" | "R" | "S";
  composite: number; // 0–100
  // headline stats
  hrRate: { d7: number; d14: number; d30: number; season: number }; // HR per game
  barrelRate: number;   // %
  exitVelo: number;     // mph
  launchAngle: number;  // deg
  xSlg: number;
  hardHit: number;      // %
  // today's matchup
  opponent: string;
  opposingPitcher: {
    name: string;
    hand: "L" | "R";
    hr9: number;
    xFip: number;
    barrelPctAllowed: number; // %
  };
  venue: string;
  parkHrIndex: number;
  // rolling trend (last 30 games), value = cumulative HR or rolling rate
  trend: { game: number; hrRate: number; leagueAvg: number }[];
}

export interface MockParlayLeg {
  playerId: number;
  player: string;
  teamAbbr: string;
  matchup: string;       // "vs LAD"
  composite: number;
  hrProbability: number; // 0–1
  americanOdds: number;
}

export interface MockParlay {
  id: string;
  legs: MockParlayLeg[];
  combinedProbability: number;
  combinedOdds: number;     // American
  confidence: number;       // 0–100
  rationale: string;
}

export interface MockPark {
  venueId: number;
  name: string;
  teamAbbr: string;
  hrIndex: number;
  hrIndexLhb: number;
  hrIndexRhb: number;
  windPattern: string;  // "Out to RF", "Swirling", "In from CF"
  altitudeFeet: number;
  dimensions: string;   // "330-400-325" (LF-CF-RF)
}

export interface MockParlayHistory {
  id: string;
  date: string;          // YYYY-MM-DD
  legCount: 2 | 3 | 4;
  players: string;       // "Judge + Ohtani + Soto"
  confidence: number;
  combinedOdds: number;
  outcome: "hit" | "miss" | "pending";
}

// ─── Helper to fabricate a believable 30-game trend ─────────────────
function makeTrend(base: number, leagueAvg = 0.18): MockPlayer["trend"] {
  const out: MockPlayer["trend"] = [];
  let v = base;
  for (let g = 1; g <= 30; g++) {
    // deterministic wiggle so SSR/CSR match (no Math.random)
    const wiggle = Math.sin(g * 0.7) * 0.05 + Math.cos(g * 0.31) * 0.03;
    v = Math.max(0.02, base + wiggle);
    out.push({ game: g, hrRate: Number(v.toFixed(3)), leagueAvg });
  }
  return out;
}

export const MOCK_PLAYERS: MockPlayer[] = [
  {
    id: 592450,
    name: "Aaron Judge",
    team: "New York Yankees",
    teamAbbr: "NYY",
    position: "RF",
    batSide: "R",
    composite: 88,
    hrRate: { d7: 0.43, d14: 0.36, d30: 0.31, season: 0.29 },
    barrelRate: 22.4,
    exitVelo: 95.8,
    launchAngle: 18.2,
    xSlg: 0.671,
    hardHit: 58.1,
    opponent: "Boston Red Sox",
    opposingPitcher: { name: "Kutter Crawford", hand: "R", hr9: 1.62, xFip: 4.31, barrelPctAllowed: 10.8 },
    venue: "Yankee Stadium",
    parkHrIndex: 121,
    trend: makeTrend(0.30),
  },
  {
    id: 660271,
    name: "Shohei Ohtani",
    team: "Los Angeles Dodgers",
    teamAbbr: "LAD",
    position: "DH",
    batSide: "L",
    composite: 85,
    hrRate: { d7: 0.29, d14: 0.32, d30: 0.28, season: 0.27 },
    barrelRate: 20.1,
    exitVelo: 94.6,
    launchAngle: 16.8,
    xSlg: 0.638,
    hardHit: 55.3,
    opponent: "Colorado Rockies",
    opposingPitcher: { name: "Cal Quantrill", hand: "R", hr9: 1.78, xFip: 4.62, barrelPctAllowed: 11.5 },
    venue: "Coors Field",
    parkHrIndex: 128,
    trend: makeTrend(0.27),
  },
  {
    id: 665742,
    name: "Juan Soto",
    team: "New York Yankees",
    teamAbbr: "NYY",
    position: "RF",
    batSide: "L",
    composite: 79,
    hrRate: { d7: 0.29, d14: 0.21, d30: 0.24, season: 0.22 },
    barrelRate: 16.8,
    exitVelo: 93.1,
    launchAngle: 14.5,
    xSlg: 0.581,
    hardHit: 52.0,
    opponent: "Boston Red Sox",
    opposingPitcher: { name: "Kutter Crawford", hand: "R", hr9: 1.62, xFip: 4.31, barrelPctAllowed: 10.8 },
    venue: "Yankee Stadium",
    parkHrIndex: 121,
    trend: makeTrend(0.22),
  },
  {
    id: 547180,
    name: "Bryce Harper",
    team: "Philadelphia Phillies",
    teamAbbr: "PHI",
    position: "1B",
    batSide: "L",
    composite: 74,
    hrRate: { d7: 0.14, d14: 0.21, d30: 0.20, season: 0.19 },
    barrelRate: 15.2,
    exitVelo: 92.4,
    launchAngle: 13.1,
    xSlg: 0.552,
    hardHit: 49.8,
    opponent: "Miami Marlins",
    opposingPitcher: { name: "Jesús Luzardo", hand: "L", hr9: 1.21, xFip: 3.74, barrelPctAllowed: 8.4 },
    venue: "Citizens Bank Park",
    parkHrIndex: 112,
    trend: makeTrend(0.19),
  },
  {
    id: 605141,
    name: "Mookie Betts",
    team: "Los Angeles Dodgers",
    teamAbbr: "LAD",
    position: "2B",
    batSide: "R",
    composite: 71,
    hrRate: { d7: 0.29, d14: 0.18, d30: 0.17, season: 0.16 },
    barrelRate: 13.6,
    exitVelo: 91.2,
    launchAngle: 19.4,
    xSlg: 0.531,
    hardHit: 46.2,
    opponent: "Colorado Rockies",
    opposingPitcher: { name: "Cal Quantrill", hand: "R", hr9: 1.78, xFip: 4.62, barrelPctAllowed: 11.5 },
    venue: "Coors Field",
    parkHrIndex: 128,
    trend: makeTrend(0.16),
  },
  {
    id: 624413,
    name: "Pete Alonso",
    team: "New York Mets",
    teamAbbr: "NYM",
    position: "1B",
    batSide: "R",
    composite: 62,
    hrRate: { d7: 0.14, d14: 0.14, d30: 0.18, season: 0.21 },
    barrelRate: 14.9,
    exitVelo: 92.0,
    launchAngle: 17.6,
    xSlg: 0.498,
    hardHit: 48.0,
    opponent: "Atlanta Braves",
    opposingPitcher: { name: "Chris Sale", hand: "L", hr9: 0.98, xFip: 3.12, barrelPctAllowed: 6.9 },
    venue: "Citi Field",
    parkHrIndex: 96,
    trend: makeTrend(0.20),
  },
];

export function getMockPlayer(id: number): MockPlayer {
  return MOCK_PLAYERS.find((p) => p.id === id) ?? MOCK_PLAYERS[0]!;
}

// ─── Parlays ────────────────────────────────────────────────────────
const leg = (p: MockPlayer, matchup: string): MockParlayLeg => ({
  playerId: p.id,
  player: p.name,
  teamAbbr: p.teamAbbr,
  matchup,
  composite: p.composite,
  hrProbability: 0.04 + (p.composite / 100) * 0.13, // ~0.04–0.16
  americanOdds: Math.round(300 + (100 - p.composite) * 6),
});

export const MOCK_PARLAYS: { two: MockParlay[]; three: MockParlay[]; four: MockParlay[] } = {
  two: [
    {
      id: "2a",
      legs: [leg(MOCK_PLAYERS[0]!, "vs BOS"), leg(MOCK_PLAYERS[1]!, "@ COL")],
      combinedProbability: 0.031,
      combinedOdds: 2950,
      confidence: 82,
      rationale: "Two elite power bats in HR-friendly parks against vulnerable righties.",
    },
    {
      id: "2b",
      legs: [leg(MOCK_PLAYERS[0]!, "vs BOS"), leg(MOCK_PLAYERS[3]!, "vs MIA")],
      combinedProbability: 0.024,
      combinedOdds: 3800,
      confidence: 76,
      rationale: "Judge at home plus Harper's platoon edge vs a fly-ball lefty.",
    },
  ],
  three: [
    {
      id: "3a",
      legs: [leg(MOCK_PLAYERS[0]!, "vs BOS"), leg(MOCK_PLAYERS[1]!, "@ COL"), leg(MOCK_PLAYERS[2]!, "vs BOS")],
      combinedProbability: 0.0072,
      combinedOdds: 13800,
      confidence: 71,
      rationale: "Stacked top-end power across three favorable parks.",
    },
    {
      id: "3b",
      legs: [leg(MOCK_PLAYERS[1]!, "@ COL"), leg(MOCK_PLAYERS[4]!, "@ COL"), leg(MOCK_PLAYERS[3]!, "vs MIA")],
      combinedProbability: 0.0051,
      combinedOdds: 19500,
      confidence: 64,
      rationale: "Coors Field altitude boost anchors two of three legs.",
    },
  ],
  four: [
    {
      id: "4a",
      legs: [
        leg(MOCK_PLAYERS[0]!, "vs BOS"),
        leg(MOCK_PLAYERS[1]!, "@ COL"),
        leg(MOCK_PLAYERS[2]!, "vs BOS"),
        leg(MOCK_PLAYERS[3]!, "vs MIA"),
      ],
      combinedProbability: 0.00138,
      combinedOdds: 72000,
      confidence: 58,
      rationale: "Lottery-ticket upside; four high-composite bats, one per game.",
    },
  ],
};

// ─── Ballparks ──────────────────────────────────────────────────────
export const MOCK_PARKS: MockPark[] = [
  { venueId: 19, name: "Coors Field", teamAbbr: "COL", hrIndex: 128, hrIndexLhb: 124, hrIndexRhb: 131, windPattern: "Out to LF", altitudeFeet: 5211, dimensions: "347-415-350" },
  { venueId: 3313, name: "Yankee Stadium", teamAbbr: "NYY", hrIndex: 121, hrIndexLhb: 131, hrIndexRhb: 110, windPattern: "Out to RF", altitudeFeet: 55, dimensions: "318-408-314" },
  { venueId: 2681, name: "Great American Ball Park", teamAbbr: "CIN", hrIndex: 118, hrIndexLhb: 116, hrIndexRhb: 119, windPattern: "Swirling", altitudeFeet: 490, dimensions: "328-404-325" },
  { venueId: 2602, name: "Citizens Bank Park", teamAbbr: "PHI", hrIndex: 112, hrIndexLhb: 113, hrIndexRhb: 111, windPattern: "Variable", altitudeFeet: 39, dimensions: "329-401-330" },
  { venueId: 22, name: "Dodger Stadium", teamAbbr: "LAD", hrIndex: 106, hrIndexLhb: 104, hrIndexRhb: 108, windPattern: "Calm", altitudeFeet: 512, dimensions: "330-395-330" },
  { venueId: 3289, name: "Citi Field", teamAbbr: "NYM", hrIndex: 96, hrIndexLhb: 98, hrIndexRhb: 95, windPattern: "In from CF", altitudeFeet: 20, dimensions: "335-408-330" },
  { venueId: 2392, name: "T-Mobile Park", teamAbbr: "SEA", hrIndex: 91, hrIndexLhb: 89, hrIndexRhb: 93, windPattern: "In from LF", altitudeFeet: 134, dimensions: "331-401-326" },
  { venueId: 2889, name: "Oracle Park", teamAbbr: "SF", hrIndex: 84, hrIndexLhb: 78, hrIndexRhb: 90, windPattern: "In from RF", altitudeFeet: 12, dimensions: "339-399-309" },
];

// ─── Parlay history ─────────────────────────────────────────────────
export const MOCK_HISTORY: MockParlayHistory[] = [
  { id: "h1", date: "2026-06-01", legCount: 2, players: "Judge + Ohtani", confidence: 81, combinedOdds: 2900, outcome: "hit" },
  { id: "h2", date: "2026-06-01", legCount: 3, players: "Judge + Soto + Harper", confidence: 70, combinedOdds: 14200, outcome: "miss" },
  { id: "h3", date: "2026-05-31", legCount: 2, players: "Alonso + Betts", confidence: 66, combinedOdds: 4100, outcome: "hit" },
  { id: "h4", date: "2026-05-31", legCount: 4, players: "Judge + Ohtani + Soto + Alonso", confidence: 57, combinedOdds: 68000, outcome: "miss" },
  { id: "h5", date: "2026-05-30", legCount: 3, players: "Ohtani + Betts + Harper", confidence: 73, combinedOdds: 12800, outcome: "hit" },
  { id: "h6", date: "2026-06-02", legCount: 2, players: "Judge + Ohtani", confidence: 82, combinedOdds: 2950, outcome: "pending" },
];

export const TODAY = "2026-06-02";
export const TODAY_GAME_COUNT = 14;

// League-average reference values for StatBar comparisons.
export const LEAGUE_AVG = {
  barrelRate: 8.5,
  exitVelo: 89.0,
  launchAngle: 12.5,
  xSlg: 0.415,
  hardHit: 38.5,
  hrRateSeason: 0.14,
};
