import type React from "react";
import { useRef } from "react";
import type { TextField } from "@/shared/lib/inputEdit";
import { renderTokenText } from "@/shared/lib/renderTokenText";
import { cn } from "@/shared/lib/utils";
import type { ValueSuggestion } from "@/shared/ui/KeyValueEditor/autocomplete";

export type VarSuggestionsComponent = React.ComponentType<{
  items: ValueSuggestion[];
  index: number;
  onHover: (i: number) => void;
  onPick: (name: string) => void;
  className?: string;
  style?: React.CSSProperties;
}>;

export interface VarTextFieldAutocomplete {
  open: boolean;
  items: ValueSuggestion[];
  index: number;
  setIndex: (i: number) => void;
  detect: (value: string, caret: number) => void;
  close: () => void;
  onKeyDownField: (e: React.KeyboardEvent, field: TextField) => boolean;
  commitField: (name: string, field: TextField) => void;
  Suggestions: VarSuggestionsComponent;
}

export interface VarTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  className?: string;
  inputClassName?: string;
  testId?: string;
  /** When false, skip token overlay (e.g. masked password fields). Autocomplete still works. */
  showTokens?: boolean;
  autocomplete?: VarTextFieldAutocomplete;
  resolveToken?: (name: string) => string | undefined;
}

/**
 * Single-line input with `{{variable}}` highlighting, hover tooltips, and optional
 * autocomplete — same overlay pattern as the URL bar and KeyValueEditor values.
 */
export function VarTextField({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  inputClassName,
  testId,
  showTokens = true,
  autocomplete: va,
  resolveToken,
}: VarTextFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const overlay = showTokens && type !== "password" && !!resolveToken;

  const syncFromField = (field: HTMLInputElement) => {
    onChange(field.value);
    syncOverlayScroll();
  };

  const syncOverlayScroll = () => {
    const input = inputRef.current;
    const layer = overlayRef.current;
    if (!(input && layer)) return;
    if (layer.scrollLeft !== input.scrollLeft) {
      layer.scrollLeft = input.scrollLeft;
    }
  };

  const detect = (el: HTMLInputElement) => {
    va?.detect(el.value, el.selectionStart ?? el.value.length);
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <input
        ref={inputRef}
        type={type}
        data-testid={testId}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target);
        }}
        onScroll={syncOverlayScroll}
        onSelect={syncOverlayScroll}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollWidth <= el.clientWidth) return;
          const dx =
            Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
          if (dx === 0) return;
          const max = el.scrollWidth - el.clientWidth;
          const next = Math.max(0, Math.min(max, el.scrollLeft + dx));
          if (next === el.scrollLeft) return;
          e.preventDefault();
          el.scrollLeft = next;
          syncOverlayScroll();
        }}
        onKeyUp={(e) => {
          syncOverlayScroll();
          detect(e.currentTarget);
        }}
        onClick={(e) => {
          syncOverlayScroll();
          detect(e.currentTarget);
        }}
        onBlur={() => va && setTimeout(va.close, 120)}
        onKeyDown={(e) => {
          const el = e.currentTarget;
          if (va?.onKeyDownField(e, el)) {
            syncFromField(el);
          }
        }}
        className={cn(
          "relative z-raised flex h-8 w-full min-w-0 rounded border border-border bg-card px-3 font-mono text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          overlay ? "text-transparent caret-foreground" : "text-foreground",
          inputClassName,
        )}
      />
      {overlay && (
        <div
          ref={overlayRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-raised overflow-hidden rounded border border-transparent px-3"
        >
          <div className="flex h-full min-w-max items-center whitespace-nowrap font-mono text-xs">
            {value ? (
              renderTokenText(value, resolveToken)
            ) : (
              <span className="text-[color:var(--text-placeholder)]">{placeholder}</span>
            )}
          </div>
        </div>
      )}
      {va?.open && (
        <va.Suggestions
          items={va.items}
          index={va.index}
          onHover={va.setIndex}
          onPick={(name) => {
            const el = inputRef.current;
            if (!el) return;
            va.commitField(name, el);
            syncFromField(el);
          }}
          style={(() => {
            const r = inputRef.current?.getBoundingClientRect();
            return r
              ? { position: "fixed", top: r.bottom + 2, left: r.left, width: r.width }
              : undefined;
          })()}
        />
      )}
    </div>
  );
}
