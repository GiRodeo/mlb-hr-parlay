// Date helpers for the YYYY-MM-DD strings used app-wide. UTC-based so they're
// stable regardless of the viewer's timezone (the app reasons about MLB game
// dates, not local wall-clock).

/** Today as YYYY-MM-DD (UTC). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add (or subtract) whole days to a YYYY-MM-DD string. */
export function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Compare two YYYY-MM-DD strings: -1 / 0 / 1. Lexical works for ISO dates. */
export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Pretty label, e.g. "Tue, Jun 3". Noon avoids any TZ date-rollover. */
export function prettyIso(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", opts ?? {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Human relative label relative to `anchor` (default today): Today / Tomorrow / Yesterday / null. */
export function relativeLabel(iso: string, anchor = todayIso()): string | null {
  if (iso === anchor) return "Today";
  if (iso === shiftIso(anchor, 1)) return "Tomorrow";
  if (iso === shiftIso(anchor, -1)) return "Yesterday";
  return null;
}
