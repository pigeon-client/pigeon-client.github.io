import { Paperclip } from "lucide-react";
import { useEffect, useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import type { KeyValue } from "@/shared/types";

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  /** Test-id prefix for rows, e.g. "param" → `param-key-0`, `param-value-0`. */
  testId?: string;
  showFilePicker?: boolean;
  inputRefs?: React.MutableRefObject<(HTMLInputElement | null)[]>;
  suggestions?: string[];
  showForIndex?: number | null;
  activeIndex?: number;
  onKeyChange?: (index: number, value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, index: number) => void;
  onKeyFocus?: (index: number) => void;
  onSelectSuggestion?: (index: number, value: string) => void;
}

function Checkbox({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: custom checkbox indicator inside a KV editor row; Radix Checkbox would break row alignment
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={on ? "Disable row" : "Enable row"}
      onClick={onClick}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded p-0 transition-colors",
        on ? "bg-primary" : "border-2 border-border bg-transparent",
      )}
    >
      {on && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-primary-foreground"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  testId,
  showFilePicker = false,
  inputRefs,
  suggestions,
  showForIndex,
  activeIndex = -1,
  onKeyChange,
  onKeyDown,
  onKeyFocus,
  onSelectSuggestion,
}: KeyValueEditorProps) {
  useEffect(() => {
    if (items.length === 0) onChange([{ key: "", value: "", enabled: true }]);
  }, [onChange, items.length]);

  const itemsWithKeys = useMemo(
    () => items.map((item, i) => ({ ...item, _rowKey: `row-${i}` })),
    [items],
  );

  const update = (index: number, field: "key" | "value" | "enabled", val: string | boolean) => {
    const updated = items.map((item, i) => (i === index ? { ...item, [field]: val } : item));
    if (index === items.length - 1 && field !== "enabled" && val !== "") {
      const last = updated[updated.length - 1];
      if (last.key !== "" || last.value !== "") {
        onChange([...updated, { key: "", value: "", enabled: true }]);
        return;
      }
    }
    onChange(updated);
  };

  const remove = (index: number) => {
    if (items.length <= 1) {
      onChange([{ key: "", value: "", enabled: true }]);
      return;
    }
    onChange(items.filter((_, i) => i !== index));
  };

  const pickFile = (index: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      onChange(
        items.map((item, i) =>
          i === index
            ? { ...item, isFile: true, file, fileName: file.name, value: file.name }
            : item,
        ),
      );
    };
    input.click();
  };

  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-[28px_1fr_1.4fr_28px] gap-0 border-b border-border pb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span />
        <span>Key</span>
        <span>Value</span>
        <span />
      </div>

      {itemsWithKeys.map((item, index) => (
        <div
          key={item._rowKey}
          className="grid h-9 grid-cols-[28px_1fr_1.4fr_28px] items-center border-b border-border"
        >
          <span className="flex items-center justify-center">
            <Checkbox on={item.enabled} onClick={() => update(index, "enabled", !item.enabled)} />
          </span>

          <div className="relative">
            <input
              ref={(el) => {
                if (inputRefs) inputRefs.current[index] = el;
              }}
              type="text"
              data-testid={testId ? `${testId}-key-${index}` : undefined}
              placeholder={keyPlaceholder}
              value={item.key}
              onChange={(e) =>
                onKeyChange
                  ? onKeyChange(index, e.target.value)
                  : update(index, "key", e.target.value)
              }
              onKeyDown={(e) => onKeyDown?.(e, index)}
              onFocus={() => onKeyFocus?.(index)}
              className={cn(
                "w-full bg-transparent font-mono text-code text-method-get outline-none",
                !item.enabled && "opacity-50",
              )}
            />
            {showForIndex === index && suggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-[var(--z-popover)] overflow-hidden rounded border border-border bg-popover shadow-lg">
                {suggestions.map((s, i) => (
                  <button
                    type="button"
                    key={s}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectSuggestion?.(index, s);
                    }}
                    className={cn(
                      "w-full cursor-pointer px-3 py-1.5 text-left font-mono text-xs",
                      i === activeIndex ? "bg-primary/15 text-primary" : "text-foreground",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {showFilePicker && item.isFile && item.file ? (
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1 bg-transparent p-0 font-[inherit] text-xs text-inherit"
                onClick={() => pickFile(index)}
              >
                <Paperclip className="h-3 w-3 text-primary" />
                <span className="truncate text-muted-foreground">{item.fileName}</span>
              </button>
            ) : (
              <input
                type="text"
                data-testid={testId ? `${testId}-value-${index}` : undefined}
                placeholder={valuePlaceholder}
                value={item.value}
                onChange={(e) => update(index, "value", e.target.value)}
                className={cn(
                  "w-full truncate bg-transparent font-mono text-code text-foreground outline-none",
                  !item.enabled && "opacity-50",
                )}
              />
            )}
          </div>

          <button
            type="button"
            aria-label="Remove row"
            onClick={() => remove(index)}
            className="flex items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      ))}

      {/* Add row */}
      <button
        type="button"
        onClick={() => onChange([...items, { key: "", value: "", enabled: true }])}
        className="mt-2.5 flex items-center gap-1.5 bg-transparent p-0 font-[inherit] text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add param
      </button>
    </div>
  );
}
