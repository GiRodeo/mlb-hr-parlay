// UI store. Keeps client-side preferences (selected date, expanded leg
// count, theme). Server state (parlays, players) lives in React Query.
// Splitting the two is the canonical Zustand + React Query pattern.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shiftIso, todayIso } from "@/lib/utils/dates";

export type LegBucket = "two" | "three" | "four";

interface UiState {
  selectedDate: string;                    // YYYY-MM-DD
  expandedBucket: LegBucket;
  showRationale: boolean;
  setSelectedDate: (d: string) => void;
  stepDate: (days: number) => void;        // +1 = tomorrow, -1 = yesterday
  goToday: () => void;
  setExpandedBucket: (b: LegBucket) => void;
  toggleRationale: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedDate: todayIso(),
      expandedBucket: "three",
      showRationale: true,
      setSelectedDate: (d) => set({ selectedDate: d }),
      stepDate: (days) => set((s) => ({ selectedDate: shiftIso(s.selectedDate, days) })),
      goToday: () => set({ selectedDate: todayIso() }),
      setExpandedBucket: (b) => set({ expandedBucket: b }),
      toggleRationale: () => set((s) => ({ showRationale: !s.showRationale })),
    }),
    {
      name: "mlb-hr-parlay-ui",
      // Don't persist selectedDate — always start on the real "today" each
      // visit, so a stale saved date can't strand the user on an old day.
      partialize: (s) => ({ expandedBucket: s.expandedBucket, showRationale: s.showRationale }),
    },
  ),
);
