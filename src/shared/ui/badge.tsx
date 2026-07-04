import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground border border-border",
        success: "bg-status-2xx/15 text-status-2xx border border-status-2xx/30",
        warning: "bg-status-4xx/15 text-status-4xx border border-status-4xx/30",
        error: "bg-status-5xx/15 text-status-5xx border border-status-5xx/30",
        info: "bg-status-3xx/15 text-status-3xx border border-status-3xx/30",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
);
Badge.displayName = "Badge";

export const METHOD_COLORS: Record<string, string> = {
  GET: "bg-method-get/15 text-method-get border border-method-get/30",
  POST: "bg-method-post/15 text-method-post border border-method-post/30",
  PUT: "bg-method-put/15 text-method-put border border-method-put/30",
  PATCH: "bg-method-patch/15 text-method-patch border border-method-patch/30",
  DELETE: "bg-method-delete/15 text-method-delete border border-method-delete/30",
  HEAD: "bg-method-head/15 text-method-head border border-method-head/30",
  OPTIONS: "bg-method-options/15 text-method-options border border-method-options/30",
};

export function MethodBadge({ method }: { method: string }) {
  const m = method.toUpperCase();
  const cls = METHOD_COLORS[m] ?? METHOD_COLORS.GET;
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[44px] items-center justify-center rounded px-1.5 font-mono text-2xs font-semibold tracking-wide",
        cls,
      )}
    >
      {m}
    </span>
  );
}

export function CountBadge({ count, active }: { count: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "ml-auto inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-2xs font-semibold",
        active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {count}
    </span>
  );
}
