// Player Profile — wired to /api/player/[id]. Header + confidence ring +
// stat bars + rolling trend + today's matchup. Handles loading, error, and
// "not in today's slate" (404) states.
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { usePlayer, PlayerNotInSlate } from "@/hooks/usePlayer";
import { useUiStore } from "@/stores/uiStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlayerAvatar } from "@/components/domain/PlayerAvatar";
import { ConfidenceRing } from "@/components/domain/ConfidenceRing";
import { StatBar } from "@/components/domain/StatBar";
import { TrendChart } from "@/components/domain/TrendChart";
import { ParkFactorBadge } from "@/components/domain/ParkFactorBadge";
import { Badge } from "@/components/ui/badge";
import { ErrorState, EmptyState, Skeleton } from "@/components/ui/states";
import { LEAGUE_AVG } from "@/lib/scoring/constants";

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const date = useUiStore((s) => s.selectedDate);
  const query = usePlayer(id, date);

  return (
    <PageContainer>
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to today's board
      </Link>

      {query.isLoading ? (
        <ProfileSkeleton />
      ) : query.error instanceof PlayerNotInSlate ? (
        <div className="mt-3">
          <EmptyState
            title="Not in today's slate"
            message="This player isn't in a confirmed lineup for the selected date. Their profile will populate when they're playing."
          />
        </div>
      ) : query.isError ? (
        <div className="mt-3">
          <ErrorState message="Couldn't load this player." onRetry={() => query.refetch()} />
        </div>
      ) : query.data ? (
        <Profile score={query.data} />
      ) : null}
    </PageContainer>
  );
}

function Profile({ score }: { score: import("@/types").Score }) {
  const d = score.display;
  const p = d.opposingPitcher;

  return (
    <>
      {/* header */}
      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto]">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <PlayerAvatar name={score.fullName} size={84} />
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{score.fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{d.teamName}</span>
                <span>·</span>
                <span>{d.position}</span>
                <span>·</span>
                <span>Bats {d.batSide === "S" ? "Switch" : d.batSide === "L" ? "Left" : "Right"}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="navy">{d.venueName}</Badge>
                <ParkFactorBadge index={d.parkHrIndex} />
                <Badge variant="secondary">{d.matchup} {d.opponentName}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex items-center justify-center px-8">
          <CardContent className="flex flex-col items-center p-6">
            <ConfidenceRing score={score.composite} size={150} />
            <span className="mt-2 text-xs text-muted-foreground">Today's HR composite</span>
          </CardContent>
        </Card>
      </div>

      {/* stat bars + windows */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Power Profile vs League</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <StatBar label="Barrel rate" value={d.barrelRate} leagueAvg={LEAGUE_AVG.barrelRate} unit="%" />
            <StatBar label="Exit velocity" value={d.exitVelo} leagueAvg={LEAGUE_AVG.exitVelo} unit=" mph" />
            <StatBar label="Hard-hit rate" value={d.hardHit} leagueAvg={LEAGUE_AVG.hardHit} unit="%" />
            <StatBar label="xSLG" value={d.xSlg} leagueAvg={LEAGUE_AVG.xSlg} format={(n) => n.toFixed(3)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>HR Rate by Window</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-4 gap-3 text-center">
              {([
                ["L7", d.hrRate.d7],
                ["L14", d.hrRate.d14],
                ["L30", d.hrRate.d30],
                ["Season", d.hrRate.season],
              ] as const).map(([label, val]) => (
                <div key={label} className="rounded-lg border border-border py-3">
                  <div className="stat-figure text-xl font-bold">{val.toFixed(2)}</div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              HR per game. League average is {LEAGUE_AVG.hrRateSeason.toFixed(2)}.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* trend */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle>Rolling HR Rate — Last 30 Games</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {d.trend && d.trend.length > 0 ? (
            <TrendChart data={d.trend} seriesLabel="HR/PA" />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Not enough game data to chart a trend yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* matchup */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle>Today's Matchup</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <PlayerAvatar name={p.name} size={48} />
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.hand}HP · Starting pitcher · {d.opponentName}
                </div>
              </div>
            </div>
            <Separator className="sm:hidden" />
            <div className="grid grid-cols-3 gap-4">
              <MatchupStat label="HR/9" value={p.hr9.toFixed(2)} flag={p.hr9 >= 1.4} />
              <MatchupStat label="xFIP" value={p.xFip.toFixed(2)} flag={p.xFip >= 4.2} />
              <MatchupStat label="Barrel% allowed" value={p.barrelPctAllowed.toFixed(1)} flag={p.barrelPctAllowed >= 9} />
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Flagged figures indicate above-average home-run vulnerability — favorable for the hitter.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function MatchupStat({ label, value, flag }: { label: string; value: string; flag: boolean }) {
  return (
    <div className="text-center">
      <div className={`stat-figure text-lg font-bold ${flag ? "text-confidence-high" : "text-foreground"}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mt-3 space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
