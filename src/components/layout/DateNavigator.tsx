// Date navigator: ‹ prev · [date] · next › with a "Today" reset. Drives the
// app-wide selectedDate so every page (dashboard, parlays, player) follows it.
// This is what enables looking ahead to tomorrow's projections.
"use client";
import { useUiStore } from "@/stores/uiStore";
import { prettyIso, relativeLabel, todayIso, compareIso } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

export function DateNavigator() {
  const selectedDate = useUiStore((s) => s.selectedDate);
  const stepDate = useUiStore((s) => s.stepDate);
  const goToday = useUiStore((s) => s.goToday);

  const rel = relativeLabel(selectedDate);
  const isToday = selectedDate === todayIso();
  const isFuture = compareIso(selectedDate, todayIso()) > 0;

  return (
    <div className="flex items-center gap-1">
      <NavBtn label="Previous day" onClick={() => stepDate(-1)}>‹</NavBtn>

      <div className="flex min-w-[8.5rem] flex-col items-center px-2 leading-tight">
        <span className="text-xs font-semibold">
          {prettyIso(selectedDate)}
        </span>
        {/* Show Today/Tomorrow/Yesterday context, or a "future" hint */}
        {(rel || isFuture) && (
          <span className={cn("text-[10px] uppercase tracking-wide",
            isFuture ? "text-accent" : "text-white/60")}>
            {rel ?? "Projected"}
          </span>
        )}
      </div>

      <NavBtn label="Next day" onClick={() => stepDate(1)}>›</NavBtn>

      {!isToday && (
        <button
          onClick={goToday}
          className="ml-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          Today
        </button>
      )}
    </div>
  );
}

function NavBtn({
  children, label, onClick,
}: {
  children: React.ReactNode; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}
