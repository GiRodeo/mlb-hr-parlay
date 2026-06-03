// React Query hook for a single player's profile (with 30-game trend).
// Distinguishes 404 (not in today's slate) from real errors so the page can
// show a "not playing today" state.

import { useQuery } from "@tanstack/react-query";
import type { Score } from "@/types";

export class PlayerNotInSlate extends Error {}

async function fetchPlayer(id: number, date: string): Promise<Score> {
  const res = await fetch(`/api/player/${id}?date=${date}`);
  if (res.status === 404) throw new PlayerNotInSlate("Player not in today's slate");
  if (!res.ok) throw new Error(`player ${res.status}`);
  return res.json();
}

export function usePlayer(id: number, date: string) {
  return useQuery({
    queryKey: ["player", id, date],
    queryFn: () => fetchPlayer(id, date),
    enabled: Number.isFinite(id) && /^\d{4}-\d{2}-\d{2}$/.test(date),
    // Don't retry a 404 — it's a definitive "not playing".
    retry: (count, err) => !(err instanceof PlayerNotInSlate) && count < 1,
  });
}
