import { cloneElement, type ReactElement, useId, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";

interface TooltipProps {
  /** Tooltip text — usually includes the keyboard shortcut, e.g. "MCP bench (⌘⇧M)". */
  label: string;
  /** A single focusable element (button/icon button). Gets aria-describedby wired in. */
  children: ReactElement<{
    "aria-describedby"?: string;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
  }>;
  side?: "top" | "bottom";
  delay?: number;
}

/**
 * Icon-only buttons have no visible label — this renders a themed tooltip on
 * hover/focus (not the browser's native `title`, which is unstyled, slow, and
 * inconsistent across platforms) while keeping `aria-describedby` for screen readers.
 */
export function Tooltip({ label, children, side = "bottom", delay = 350 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };

  return (
    <span className="relative inline-flex">
      {cloneElement(children, {
        "aria-describedby": open ? id : undefined,
        onMouseEnter: (e: React.MouseEvent) => {
          children.props.onMouseEnter?.(e);
          show();
        },
        onMouseLeave: (e: React.MouseEvent) => {
          children.props.onMouseLeave?.(e);
          hide();
        },
        onFocus: (e: React.FocusEvent) => {
          children.props.onFocus?.(e);
          show();
        },
        onBlur: (e: React.FocusEvent) => {
          children.props.onBlur?.(e);
          hide();
        },
      })}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-1/2 z-[var(--z-popover)] -translate-x-1/2 whitespace-nowrap rounded border border-border bg-popover px-2 py-1 text-2xs font-medium text-foreground shadow-lg",
            side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
          )}
          style={{ animation: "pgFade 100ms ease-out" }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
