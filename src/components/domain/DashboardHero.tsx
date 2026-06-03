// Dashboard hero banner: date, game count, and the single top parlay.
import { ParlayCard } from "./ParlayCard";
import type { Parlay } from "@/types";

export interface DashboardHeroProps {
  date: string;        // YYYY-MM-DD
  gameCount: number;
  topParlay?: Parlay;  // omitted when the slate has no qualifying parlay
  playersScored?: number;
}

export function DashboardHero({ date, gameCount, topParlay, playersScored }: DashboardHeroProps) {
  const pretty = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const topComposite = topParlay
    ? Math.round(Math.max(...topParlay.legs.map((l) => l.composite)))
    : 0;

  return (
    <div className="overflow-hidden rounded-xl bg-navy text-navy-foreground">
      <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
        <div className="flex flex-col justify-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Today's Board
          </span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{pretty}</h1>
          <p className="mt-2 max-w-md text-sm text-white/70">
            {gameCount} games on the slate. Our model scored every projected hitter on
            power, matchup, park, and weather to surface today's best home-run bets.
          </p>
          <div className="mt-4 flex gap-6">
            <Metric label="Games" value={String(gameCount)} />
            <Metric label="Hitters scored" value={playersScored != null ? String(playersScored) : "—"} />
            <Metric label="Top composite" value={topComposite ? String(topComposite) : "—"} />
          </div>
        </div>

        {/* top parlay rendered on a white card so it pops off the navy */}
        <div className="md:max-w-sm">
          {topParlay ? (
            <ParlayCard parlay={topParlay} featured />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg bg-white/10 p-6 text-center text-sm text-white/70">
              No qualifying parlay yet today — check back once lineups are confirmed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-figure text-2xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-white/60">{label}</div>
    </div>
  );
}
