// React Query hook for parlay history + summary, with filters.

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { HistoryFilters, HistoryResponse } from "@/types";

async function fetchHistory(filters: HistoryFilters): Promise<HistoryResponse> {
  const sp = new URLSearchParams();
  if (filters.legCount) sp.set("legCount", String(filters.legCount));
  if (filters.minConfidence != null) sp.set("minConfidence", String(filters.minConfidence));
  if (filters.sinceDate) sp.set("since", filters.sinceDate);
  const res = await fetch(`/api/history?${sp.toString()}`);
  if (!res.ok) throw new Error(`history ${res.status}`);
  return res.json();
}

export function useHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: ["history", filters],
    queryFn: () => fetchHistory(filters),
    // Keep the previous table visible while a new filter query loads.
    placeholderData: keepPreviousData,
  });
}
