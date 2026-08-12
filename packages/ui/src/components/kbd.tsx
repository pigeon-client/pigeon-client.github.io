import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/cn";

const kbdVariants = cva(
  "inline-flex items-center justify-center rounded border border-border bg-input font-mono font-semibold text-foreground",
  {
    variants: {
      size: {
        sm: "h-5 min-w-[22px] px-1 text-2xs",
        md: "h-5 min-w-[22px] px-1.5 text-2xs",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface KbdProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof kbdVariants> {}

export function Kbd({ className, size, ...props }: KbdProps) {
  return <kbd className={cn(kbdVariants({ size }), className)} {...props} />;
}
