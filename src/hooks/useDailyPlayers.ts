// React Query hook for the daily scored-players endpoint.

import { useQuery } from "@tanstack/react-query";
import type { Score, TeamId } from "@/types";

export interface DailyPlayersResponse {
  date: string;
  count: number;
  players: Array<Score & { teamId: TeamId }>;
}

async function fetchPlayers(date: string): Promise<DailyPlayersResponse> {
  const res = await fetch(`/api/players?date=${date}`);
  if (!res.ok) throw new Error(`players ${res.status}`);
  return res.json();
}

export function useDailyPlayers(date: string) {
  return useQuery({
    queryKey: ["players", date],
    queryFn: () => fetchPlayers(date),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}
