// Composite scoring entry point. Takes a fully assembled PlayerGameContext
// and returns a Score with subscores, contributions, composite, and an
// implied HR probability for use by the parlay builder.
//
// Pure function — no I/O — so it's trivially testable and idempotent.

import {
  recentFormScore, powerScore, expectedScore, pitcherVulnScore,
  parkScore, platoonScore, weatherScore, lineupScore, streakScore,
} from "./features";
import { DEFAULT_WEIGHTS } from "./weights";
import { compositeToHrProbability } from "./calibrate";
import { getTeam } from "@/lib/services/teams";
import type {
  BattingSplit, FeatureSubscores, PlayerGameContext, Score, ScoreDisplay, ScoringWeights,
} from "@/types";

// Build the display sub-object from the same context that was scored. Pure —
// getTeam is a static map lookup. Keeps scorePlayer readable.
function buildDisplay(ctx: PlayerGameContext): ScoreDisplay {
  const team = getTeam(ctx.teamId);
  const opp = getTeam(ctx.opponentTeamId);
  const b = ctx.statcastBatter;
  const find = (w: BattingSplit["windowDays"]) =>
    ctx.splits.find((s) => s.windowDays === w);
  const perGame = (s?: BattingSplit) =>
    // splits store HR/PA; approximate HR/game with ~4.1 PA/game for display.
    s ? Number((s.homeRunRatePerPA * 4.1).toFixed(2)) : 0;

  return {
    teamAbbr: team.abbr,
    teamName: team.name,
    position: ctx.position,
    batSide: ctx.batSide,
    isHome: ctx.isHome,
    projected: ctx.projected,
    opponentName: opp.name,
    matchup: `${ctx.isHome ? "vs" : "@"} ${opp.abbr}`,

    barrelRate: Number((b.barrelRate * 100).toFixed(1)),
    exitVelo: Number(b.exitVeloAvgMph.toFixed(1)),
    launchAngle: Number(b.launchAngleAvgDeg.toFixed(1)),
    hardHit: Number((b.hardHitRate * 100).toFixed(1)),
    xSlg: Number(b.xSlg.toFixed(3)),

    hrRate: {
      d7: perGame(find(7)),
      d14: perGame(find(14)),
      d30: perGame(find(30)),
      season: perGame(find("season")),
    },

    opposingPitcher: {
      name: ctx.opposingPitcherName || "TBD",
      hand: ctx.opposingPitcherHand,
      hr9: Number(ctx.pitcherAdvanced.hr9.toFixed(2)),
      xFip: Number(ctx.pitcherAdvanced.xFip.toFixed(2)),
      barrelPctAllowed: Number(
        ((ctx.pitcherAdvanced.barrelPctAllowed ?? ctx.pitcherStatcast.barrelRateAllowed) * 100).toFixed(1),
      ),
    },

    venueName: ctx.park.venueName,
    parkHrIndex:
      ctx.batSide === "L" ? ctx.park.hrIndexVsLhb :
      ctx.batSide === "R" ? ctx.park.hrIndexVsRhb :
      Math.round((ctx.park.hrIndexVsLhb + ctx.park.hrIndexVsRhb) / 2),
  };
}

export function scorePlayer(
  ctx: PlayerGameContext,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): Score {
  const subscores: FeatureSubscores = {
    recentForm: recentFormScore(ctx.splits),
    power: powerScore(ctx.statcastBatter),
    expected: expectedScore(ctx.statcastBatter),
    pitcherVuln: pitcherVulnScore(ctx.pitcherAdvanced, ctx.pitcherStatcast),
    park: parkScore(ctx.park, ctx.batSide),
    platoon: platoonScore(ctx.batSide, ctx.opposingPitcherHand),
    weather: weatherScore(ctx.weather),
    lineup: lineupScore(ctx.battingOrder),
    streak: streakScore(ctx.splits),
  };

  // Per-feature contribution (subscore × weight). Sum equals composite.
  const contributions: FeatureSubscores = {
    recentForm: subscores.recentForm * weights.recentForm,
    power: subscores.power * weights.power,
    expected: subscores.expected * weights.expected,
    pitcherVuln: subscores.pitcherVuln * weights.pitcherVuln,
    park: subscores.park * weights.park,
    platoon: subscores.platoon * weights.platoon,
    weather: subscores.weather * weights.weather,
    lineup: subscores.lineup * weights.lineup,
    streak: subscores.streak * weights.streak,
  };
  const composite = Object.values(contributions).reduce((a, b) => a + b, 0);

  return {
    playerId: ctx.playerId,
    fullName: ctx.fullName,
    gameId: ctx.gameId,
    composite,
    subscores,
    contributions,
    impliedHrProbability: compositeToHrProbability(composite),
    display: buildDisplay(ctx),
  };
}

// Convenience: score a list and return them sorted descending by composite.
export function scoreAndRank(ctxs: PlayerGameContext[], weights?: ScoringWeights): Score[] {
  return ctxs.map((c) => scorePlayer(c, weights)).sort((a, b) => b.composite - a.composite);
}
