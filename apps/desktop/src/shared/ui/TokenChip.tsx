import { cn } from "@pigeon/ui";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export function TokenChip({
  token,
  missing,
  tooltip,
  onMouseDown,
  className,
}: {
  token: string;
  missing: boolean;
  tooltip?: string;
  onMouseDown?: () => void;
  /** Optional override; defaults to light-primary `text-var-token`. */
  className?: string;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (!tooltip) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setPosition({ x: rect.left + rect.width / 2, y: rect.top });
      setOpen(true);
    }, 120);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
    setPosition(null);
  };

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover-only preview on display overlay */}
      <span
        ref={anchorRef}
        data-testid="env-token"
        onMouseEnter={show}
        onMouseLeave={hide}
        onMouseDown={(event) => {
          if (!onMouseDown) return;
          event.preventDefault();
          onMouseDown();
        }}
        className={cn(
          "pointer-events-auto cursor-help font-medium",
          missing
            ? "text-destructive underline decoration-dotted underline-offset-2"
            : (className ?? "text-var-token"),
        )}
      >
        {token}
      </span>
      {open &&
        tooltip &&
        position &&
        createPortal(
          <span
            role="tooltip"
            data-testid="env-token-tooltip"
            className={cn(
              "pointer-events-none fixed z-popover max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-[calc(100%+6px)] truncate rounded border border-border bg-popover px-2 py-1 font-mono text-2xs font-medium shadow-lg",
              missing ? "text-destructive" : "text-foreground",
            )}
            style={{
              top: position.y,
              left: position.x,
              animation: "pgFade 100ms ease-out",
            }}
          >
            {tooltip}
          </span>,
          document.body,
        )}
    </>
  );
}
