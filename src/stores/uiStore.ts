// UI store. Keeps client-side preferences (selected date, expanded leg
// count, theme). Server state (parlays, players) lives in React Query.
// Splitting the two is the canonical Zustand + React Query pattern.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LegBucket = "two" | "three" | "four";

interface UiState {
  selectedDate: string;                    // YYYY-MM-DD
  expandedBucket: LegBucket;
  showRationale: boolean;
  setSelectedDate: (d: string) => void;
  setExpandedBucket: (b: LegBucket) => void;
  toggleRationale: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedDate: new Date().toISOString().slice(0, 10),
      expandedBucket: "three",
      showRationale: true,
      setSelectedDate: (d) => set({ selectedDate: d }),
      setExpandedBucket: (b) => set({ expandedBucket: b }),
      toggleRationale: () => set((s) => ({ showRationale: !s.showRationale })),
    }),
    { name: "mlb-hr-parlay-ui" },
  ),
);
