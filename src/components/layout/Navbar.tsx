// Top navigation. Navy bar, brand mark, primary links, date pill.
// Mobile: links collapse into a horizontal scroll row under the brand.
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/stores/uiStore";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/parlays", label: "Parlays" },
  { href: "/ballparks", label: "Ballparks" },
];

export function Navbar() {
  const pathname = usePathname();
  const selectedDate = useUiStore((s) => s.selectedDate);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 bg-navy text-navy-foreground shadow-sm">
      <div className="container flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-black text-accent-foreground">
              HR
            </span>
            <span className="hidden sm:inline">Parlay Engine</span>
          </Link>
          <nav className="flex items-center gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(l.href)
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </header>
  );
}
