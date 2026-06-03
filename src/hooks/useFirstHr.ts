// React Query hook for the first-HR-of-the-game model + odds.
import { useQuery } from "@tanstack/react-query";
import type { FirstHrResponse } from "@/types";

async function fetchFirstHr(date: string): Promise<FirstHrResponse> {
  const res = await fetch(`/api/first-hr?date=${date}`);
  if (!res.ok) throw new Error(`first-hr ${res.status}`);
  return res.json();
}

export function useFirstHr(date: string) {
  return useQuery({
    queryKey: ["first-hr", date],
    queryFn: () => fetchFirstHr(date),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}
