import type { HTMLAttributes } from "react";

type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-[rgba(74,222,128,0.12)] text-[#4ADE80]",
  warning: "bg-[rgba(251,146,60,0.12)]  text-[#FB923C]",
  error: "bg-[rgba(248,113,113,0.12)] text-[#F87171]",
  info: "bg-[rgba(74,158,250,0.12)]  text-[#4A9EFA]",
  default: "bg-[var(--bg-elevated)]     text-[var(--text-secondary)]",
};

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={[
        "inline-flex items-center px-[6px] py-[1px] rounded-[4px] font-mono text-[11px] font-semibold",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

/* ── Method badge (colored per HTTP method) ── */
export const METHOD_COLORS: Record<string, string> = {
  GET: "#4A9EFA",
  POST: "#4ADE80",
  PUT: "#FB923C",
  PATCH: "#FBBF24",
  DELETE: "#F87171",
  HEAD: "#C084FC",
  OPTIONS: "#94A3B8",
};

interface MethodBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  method: string;
}

export function MethodBadge({ method, className = "", ...props }: MethodBadgeProps) {
  const color = METHOD_COLORS[method] ?? "#94A3B8";
  return (
    <span
      {...props}
      style={{ color, background: `${color}24` }}
      className={[
        "inline-flex items-center justify-center w-[42px] h-[16px] rounded-[4px] font-[inherit] text-[9.5px] font-bold tracking-wider shrink-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {method}
    </span>
  );
}

/* ── Count badge (numeric, used in tab bars) ── */
interface CountBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  count: number;
  active?: boolean;
}

export function CountBadge({ count, active = false, className = "", ...props }: CountBadgeProps) {
  return (
    <span
      {...props}
      className={[
        "inline-flex items-center justify-center min-w-[17px] h-[16px] px-[4px] rounded-[20px] text-[10px] font-bold",
        active
          ? "bg-[rgba(124,110,250,0.2)] text-[#9488FB]"
          : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {count}
    </span>
  );
}
