// shadcn/ui's standard class-merge helper. Lives in lib/utils so component
// files can import { cn } from "@/lib/utils/cn".
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
