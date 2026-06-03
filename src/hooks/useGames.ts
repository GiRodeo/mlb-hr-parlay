// React Query hook for today's schedule (used for the games count + any
// future schedule UI).

import { useQuery } from "@tanstack/react-query";
import type { ScheduledGame } from "@/types";

async function fetchGames(date: string): Promise<{ date: string; games: ScheduledGame[] }> {
  const res = await fetch(`/api/games?date=${date}`);
  if (!res.ok) throw new Error(`games ${res.status}`);
  return res.json();
}

export function useGames(date: string) {
  return useQuery({
    queryKey: ["games", date],
    queryFn: () => fetchGames(date),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}
