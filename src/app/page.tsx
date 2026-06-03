// Today's Dashboard — wired to live data via React Query.
// Hero + Best Bets grid + Today's Parlays come from /api/players + /api/parlays.
"use client";

import { useUiStore } from "@/stores/uiStore";
import { useDailyPlayers } from "@/hooks/useDailyPlayers";
import { useDailyParlays } from "@/hooks/useDailyParlays";
import { useGames } from "@/hooks/useGames";
import { PageContainer, SectionHeading } from "@/components/layout/PageContainer";
import { DashboardHero } from "@/components/domain/DashboardHero";
import { PlayerCard } from "@/components/domain/PlayerCard";
import { ParlayCard } from "@/components/domain/ParlayCard";
import { WeatherParkSidebar } from "@/components/domain/WeatherParkSidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardGridSkeleton, ErrorState, EmptyState, Skeleton } from "@/components/ui/states";
import type { Parlay } from "@/types";

export default function DashboardPage() {
  // Selected date is shared app-wide via the Zustand UI store.
  const date = useUiStore((s) => s.selectedDate);
  const players = useDailyPlayers(date);
  const parlays = useDailyParlays(date);
  const games = useGames(date);

  const bestBets = players.data?.players.slice(0, 5) ?? [];
  const topParlay =
    parlays.data?.twoLeg[0] ?? parlays.data?.threeLeg[0] ?? parlays.data?.fourLeg[0];

  return (
    <PageContainer>
      {/* Hero — show a skeleton band while the first load is in flight */}
      {parlays.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <DashboardHero
          date={date}
          gameCount={games.data?.games.length ?? 0}
          topParlay={topParlay}
          playersScored={players.data?.count}
        />
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-10">
          {/* Best Bets */}
          <section>
            <SectionHeading
              title="Best Bets Today"
              subtitle="Top 5 individual home-run candidates by composite score"
            />
            {players.isLoading ? (
              <CardGridSkeleton count={5} />
            ) : players.isError ? (
              <ErrorState message="Couldn't load today's players." onRetry={() => players.refetch()} />
            ) : bestBets.length === 0 ? (
              <EmptyState
                title="No scored players yet"
                message="Lineups may not be confirmed. Check back closer to first pitch."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {bestBets.map((p, i) => (
                  <PlayerCard key={String(p.playerId)} player={p} rank={i + 1} />
                ))}
              </div>
            )}
          </section>

          {/* Today's Parlays */}
          <section>
            <SectionHeading
              title="Today's Parlays"
              subtitle="Model-optimized 2, 3, and 4-leg combinations"
            />
            {parlays.isLoading ? (
              <CardGridSkeleton count={4} />
            ) : parlays.isError ? (
              <ErrorState message="Couldn't load today's parlays." onRetry={() => parlays.refetch()} />
            ) : (
              <Tabs defaultValue="two">
                <TabsList>
                  <TabsTrigger value="two">2-Leg</TabsTrigger>
                  <TabsTrigger value="three">3-Leg</TabsTrigger>
                  <TabsTrigger value="four">4-Leg</TabsTrigger>
                </TabsList>
                <ParlayBucket value="two" parlays={parlays.data?.twoLeg ?? []} />
                <ParlayBucket value="three" parlays={parlays.data?.threeLeg ?? []} />
                <ParlayBucket value="four" parlays={parlays.data?.fourLeg ?? []} />
              </Tabs>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <WeatherParkSidebar />
        </aside>
      </div>
    </PageContainer>
  );
}

function ParlayBucket({ value, parlays }: { value: string; parlays: Parlay[] }) {
  return (
    <TabsContent value={value}>
      {parlays.length === 0 ? (
        <EmptyState title="No parlays in this bucket" message="Not enough qualifying players today." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {parlays.map((p, i) => (
            <ParlayCard key={i} parlay={p} />
          ))}
        </div>
      )}
    </TabsContent>
  );
}
