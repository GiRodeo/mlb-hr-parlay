// React Query hooks for the bankroll tracker: read bets + summary, and log a
// new bet (invalidating the list on success).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BankrollResponse, NewBetInput } from "@/types";

async function fetchBets(): Promise<BankrollResponse> {
  const res = await fetch("/api/bets");
  if (!res.ok) throw new Error(`bets ${res.status}`);
  return res.json();
}

export function useBets() {
  return useQuery({ queryKey: ["bets"], queryFn: fetchBets });
}

export function useAddBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewBetInput) => {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `add bet failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bets"] }),
  });
}
