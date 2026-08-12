import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/cn";

const labelVariants = cva("text-muted-foreground", {
  variants: {
    variant: {
      default: "text-xs",
      field: "mb-2 block text-2xs font-semibold uppercase tracking-wide",
      helper: "mt-1.5 block text-2xs",
      error: "block text-xs text-destructive",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {}

/**
 * Form label. Pass `htmlFor` (or wrap a control) when using `default`/`field`.
 * `helper`/`error` render as non-label text so they can sit under inputs freely.
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant = "default", htmlFor, ...props }, ref) => {
    const classes = cn(labelVariants({ variant }), className);
    if (variant === "helper" || variant === "error") {
      return <p className={classes} {...(props as React.HTMLAttributes<HTMLParagraphElement>)} />;
    }
    // biome-ignore lint/a11y/noLabelWithoutControl: association via htmlFor/children is caller-owned
    return <label ref={ref} htmlFor={htmlFor} className={classes} {...props} />;
  },
);
Label.displayName = "Label";
