// shadcn/ui Badge primitive with confidence-aware variants.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        navy: "border-transparent bg-navy text-navy-foreground",
        high: "border-transparent bg-confidence-high text-white",
        med: "border-transparent bg-confidence-med text-white",
        low: "border-transparent bg-confidence-low text-white",
        "high-soft": "border-confidence-high/30 bg-confidence-high/10 text-confidence-high",
        "med-soft": "border-confidence-med/30 bg-confidence-med/10 text-confidence-med",
        "low-soft": "border-confidence-low/30 bg-confidence-low/10 text-confidence-low",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
