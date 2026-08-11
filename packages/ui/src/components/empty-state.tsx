import { cn } from "../lib/cn";
import { Button } from "./button";

/**
 * Centered empty-pane copy used by history / drafts / collections sidebars.
 * Feature-specific empty heroes (request canvas, response pane) stay in the app.
 */
export function EmptyState({
  icon,
  label,
  sub,
  action,
  className,
}: {
  icon: string;
  label: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center",
        className,
      )}
    >
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {sub ? <span className="text-2xs leading-normal text-muted-foreground">{sub}</span> : null}
      {action ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={action.onClick}
          className="mt-1.5 h-auto p-0 text-xs font-medium text-primary hover:bg-transparent hover:underline"
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
