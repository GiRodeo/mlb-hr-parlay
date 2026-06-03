// React Query hook for the ballparks table.

import { useQuery } from "@tanstack/react-query";
import type { ParkView } from "@/types";

async function fetchParks(): Promise<{ parks: ParkView[] }> {
  const res = await fetch("/api/parks");
  if (!res.ok) throw new Error(`parks ${res.status}`);
  return res.json();
}

export function useParks() {
  return useQuery({
    queryKey: ["parks"],
    queryFn: fetchParks,
    staleTime: 24 * 60 * 60 * 1000, // park data changes ~seasonally
  });
}
