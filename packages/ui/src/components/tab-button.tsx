import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type Variant = "sidebar" | "underline";

interface TabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: Variant;
  children?: ReactNode;
  testId?: string;
  ariaLabel?: string;
}

/**
 * Standalone tab button for places that are not wrapped in Radix Tabs
 * (sidebar kind switcher, response Body/Headers). Prefer Tabs/TabsTrigger
 * when the panel is a real tabbed region.
 */
export function TabButton({
  active = false,
  onClick,
  variant = "underline",
  children,
  testId,
  ariaLabel,
  className,
  ...rest
}: TabButtonProps) {
  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        aria-label={ariaLabel}
        data-state={active ? "active" : "inactive"}
        className={cn(
          "inline-flex h-7 w-full items-center justify-center gap-1.5 rounded px-1 text-xs font-medium transition-colors",
          active
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-label={ariaLabel}
      data-state={active ? "active" : "inactive"}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** @deprecated Use TabButton — kept as alias for migration. */
export const Tab = TabButton;
