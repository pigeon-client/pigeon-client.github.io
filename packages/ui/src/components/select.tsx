import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/cn";

const selectVariants = cva(
  "flex w-full cursor-pointer appearance-none rounded border border-border bg-card bg-[length:14px] bg-[right_0.75rem_center] bg-no-repeat font-[inherit] text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-7 px-2.5 pr-8 text-xs",
        md: "h-8 px-3 pr-8 text-xs",
        lg: "h-9 px-3 pr-8 text-xs",
      },
      mono: {
        true: "font-mono",
        false: "",
      },
    },
    defaultVariants: { size: "md", mono: true },
  },
);

/** Inline SVG chevron so native <select> matches AuthEditor / settings chrome. */
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b909c' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, size, mono, style, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(selectVariants({ size, mono }), className)}
      style={{ backgroundImage: CHEVRON, ...style }}
      {...props}
    />
  ),
);
Select.displayName = "Select";
