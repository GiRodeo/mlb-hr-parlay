// React Query hook for the value/EV endpoint.
import { useQuery } from "@tanstack/react-query";
import type { ValueResponse } from "@/types";

async function fetchValue(date: string): Promise<ValueResponse> {
  const res = await fetch(`/api/value?date=${date}`);
  if (!res.ok) throw new Error(`value ${res.status}`);
  return res.json();
}

export function useValue(date: string) {
  return useQuery({
    queryKey: ["value", date],
    queryFn: () => fetchValue(date),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}
