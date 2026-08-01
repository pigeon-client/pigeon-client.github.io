/**
 * Backwards-compatibility shim for the old bespoke <Tab> API used in
 * Sidebar.tsx and ResponsePanel.tsx. New code should use the Radix-backed
 * Tabs/TabsList/TabsTrigger primitives from ./tabs.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "sidebar" | "underline";

interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  onClick?: () => void;
  variant?: Variant;
  children?: ReactNode;
  testId?: string;
  ariaLabel?: string;
}

export function Tab({
  active = false,
  onClick,
  variant = "underline",
  children,
  testId,
  ariaLabel,
  ...rest
}: TabProps) {
  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        aria-label={ariaLabel}
        data-state={active ? "active" : "inactive"}
        className={
          "inline-flex h-7 w-full items-center justify-center gap-1.5 rounded px-1 text-xs font-medium transition-colors " +
          (active
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground")
        }
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
      className={
        "inline-flex h-8 items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors " +
        (active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground")
      }
      {...rest}
    >
      {children}
    </button>
  );
}
