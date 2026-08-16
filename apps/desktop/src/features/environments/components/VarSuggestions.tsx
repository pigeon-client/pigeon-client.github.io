import { cn, Menu } from "@pigeon/ui";
import type React from "react";
import type { VarSuggestion } from "../hooks/useVarAutocomplete";

/** The `{{variable}}` autocomplete popover. Positioned by the caller. */
export function VarSuggestions({
  items,
  index,
  onHover,
  onPick,
  className,
  style,
}: {
  items: VarSuggestion[];
  index: number;
  onHover: (i: number) => void;
  onPick: (name: string) => void;
  className?: string;
  /** When set, caller positions the popover explicitly (e.g. `position: fixed`
      to escape an `overflow-hidden` ancestor). */
  style?: React.CSSProperties;
}) {
  if (items.length === 0) return null;
  return (
    <Menu style={style} className={cn("absolute z-popover max-h-56 w-[240px]", className)}>
      {items.map((item, i) => {
        const active = i === index;
        const random = item.kind === "random";
        return (
          <button
            key={item.name}
            type="button"
            data-testid="var-suggestion"
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(item.name);
            }}
            onMouseEnter={() => onHover(i)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left font-mono text-xs",
              active && "bg-primary/15",
            )}
          >
            <span className={cn("truncate", active ? "text-primary" : "text-var-token")}>
              {item.name}
            </span>
            <span className="ml-2 max-w-[110px] shrink-0 truncate text-2xs text-muted-foreground">
              {random ? "dynamic" : (item.value ?? "")}
            </span>
          </button>
        );
      })}
    </Menu>
  );
}
