// React Query hook around /api/parlays. The UI imports this; it should
// never call /api routes directly via fetch — that ensures one cache key
// and consistent loading/error semantics across the app.

import { useQuery } from "@tanstack/react-query";
import type { DailyParlayBundle } from "@/types";

async function fetchParlays(date: string): Promise<DailyParlayBundle> {
  const res = await fetch(`/api/parlays?date=${date}`);
  if (!res.ok) throw new Error(`parlays ${res.status}`);
  return res.json();
}

export function useDailyParlays(date: string) {
  return useQuery({
    queryKey: ["parlays", date],
    queryFn: () => fetchParlays(date),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}
