// Player photo placeholder. Uses initials on a navy gradient — swap the
// <img> in later when headshots are wired up (MLB provides headshot URLs by
// player ID).
import { cn } from "@/lib/utils/cn";

export interface PlayerAvatarProps {
  name: string;
  size?: number; // px
  className?: string;
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return (first + last).toUpperCase();
}

export function PlayerAvatar({ name, size = 40, className }: PlayerAvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy/70 font-semibold text-navy-foreground ring-2 ring-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
