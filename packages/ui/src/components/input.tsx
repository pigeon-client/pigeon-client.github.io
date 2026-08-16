import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/cn";

const inputVariants = cva(
  "flex w-full rounded bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border aria-invalid:border-destructive",
  {
    variants: {
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-8 px-3 text-xs",
        lg: "h-9 px-3 text-xs",
      },
      mono: {
        true: "font-mono",
        false: "",
      },
    },
    defaultVariants: { size: "md", mono: true },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, mono, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(inputVariants({ size, mono }), className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";
