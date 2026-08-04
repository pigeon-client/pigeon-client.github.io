import { cn } from "@/shared/lib/utils";

export function TokenChip({
  token,
  missing,
  onEnter,
  onLeave,
  onMouseDown,
}: {
  token: string;
  missing: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onMouseDown: () => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover-only preview enhancement inside a display overlay; the resolved value is non-essential (also shown in the URL preview line) and needs no keyboard path
    <span
      data-testid="env-token"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown();
      }}
      className={cn(
        "pointer-events-auto cursor-help font-medium",
        missing
          ? "text-destructive underline decoration-dotted underline-offset-2"
          : "text-[color:var(--var-token)]",
      )}
    >
      {token}
    </span>
  );
}
