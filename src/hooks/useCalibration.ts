// React Query hook for the model calibration / reliability data.
import { useQuery } from "@tanstack/react-query";
import type { CalibrationSummary } from "@/types";

async function fetchCalibration(): Promise<CalibrationSummary> {
  const res = await fetch("/api/calibration");
  if (!res.ok) throw new Error(`calibration ${res.status}`);
  return res.json();
}

export function useCalibration() {
  return useQuery({
    queryKey: ["calibration"],
    queryFn: fetchCalibration,
    staleTime: 60 * 60 * 1000, // changes slowly (recomputed from history)
  });
}
