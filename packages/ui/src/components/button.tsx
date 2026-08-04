import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded font-medium transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        "ghost-icon":
          "bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-accent",
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_2px_12px_color-mix(in_oklch,var(--primary)_40%,transparent)]",
        "danger-ghost":
          "bg-transparent border border-border text-muted-foreground hover:border-destructive hover:text-destructive",
        "danger-filled":
          "bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20",
      },
      size: {
        icon: "h-7 w-7 p-0 rounded text-xs",
        xs: "h-7 px-2.5 rounded text-2xs",
        sm: "h-8 px-3 rounded text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "sm" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
  },
);
Button.displayName = "Button";
