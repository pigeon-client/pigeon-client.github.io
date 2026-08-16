import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/cn";

const textareaVariants = cva(
  "flex w-full resize-none rounded bg-card px-3.5 py-3 font-mono text-xs leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border aria-invalid:border-destructive",
  {
    variants: {
      size: {
        sm: "min-h-20 px-3 py-2",
        md: "min-h-[136px]",
        lg: "min-h-48",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, ...props }, ref) => (
    <textarea ref={ref} className={cn(textareaVariants({ size }), className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";
