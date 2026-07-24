import { Eye, EyeOff, Lock, Paperclip, Unlock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { VarSuggestions } from "@/features/environments/components/VarSuggestions";
import { useVarAutocomplete } from "@/features/environments/hooks/useVarAutocomplete";
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
  /** Label for the add-row button (default "Add param"). */
  addLabel?: string;
  /** Show a per-row secret toggle + eye reveal and mask secret values. */
  secret?: boolean;
  /** Inline validation error under a row's key (e.g. duplicate / reserved). */
  rowError?: (index: number) => string | null;
  inputRefs?: React.MutableRefObject<(HTMLInputElement | null)[]>;
  suggestions?: string[];
  showForIndex?: number | null;
  activeIndex?: number;
  onKeyChange?: (index: number, value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, index: number) => void;
  onKeyFocus?: (index: number) => void;
  onSelectSuggestion?: (index: number, value: string) => void;
}

/** Render text with `{{tokens}}` tinted in the variable color. */
function renderTokenText(text: string) {
  return text.split(/(\{\{[^}]*\}\})/g).map((part, i) =>
    /^\{\{[^}]*\}\}$/.test(part) ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: positional text fragments
      <span key={`v-${i}`} className="text-[color:var(--var-token)]">
        {part}
      </span>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: positional text fragments
      <span key={`v-${i}`} className="text-foreground">
        {part}
      </span>
    ),
  );
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
  addLabel = "Add param",
  showFilePicker = false,
  secret = false,
  rowError,
  inputRefs,
  suggestions,
  showForIndex,
  activeIndex = -1,
  onKeyChange,
  onKeyDown,
  onKeyFocus,
  onSelectSuggestion,
}: KeyValueEditorProps) {
  const [reveal, setReveal] = useState<Record<number, boolean>>({});
  const va = useVarAutocomplete();
  const [acRow, setAcRow] = useState<number | null>(null);
  const valueRefs = useRef<(HTMLInputElement | null)[]>([]);
  // minmax(0,…) so long keys/values shrink inside the panel instead of expanding it
  const cols = secret
    ? "grid-cols-[28px_minmax(0,1fr)_minmax(0,1.4fr)_52px_28px]"
    : "grid-cols-[28px_minmax(0,1fr)_minmax(0,1.4fr)_28px]";

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

  const applyValue = (index: number) => (next: string, caret: number) => {
    update(index, "value", next);
    requestAnimationFrame(() => {
      const el = valueRefs.current[index];
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
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
    <div className="min-w-0">
      {/* Column headers */}
      <div
        className={cn(
          "grid min-w-0 gap-0 border-b border-border pb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground",
          cols,
        )}
      >
        <span />
        <span>Key</span>
        <span>Value</span>
        {secret && <span />}
        <span />
      </div>

      {itemsWithKeys.map((item, index) => (
        <div
          key={item._rowKey}
          className={cn("grid min-h-9 min-w-0 items-center border-b border-border", cols)}
        >
          <span className="flex items-center justify-center">
            <Checkbox on={item.enabled} onClick={() => update(index, "enabled", !item.enabled)} />
          </span>

          <div className="relative min-w-0">
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
                "w-full min-w-0 bg-transparent font-mono text-code outline-none",
                rowError?.(index) ? "text-destructive" : "text-method-get",
                !item.enabled && "opacity-50",
              )}
            />
            {rowError?.(index) && (
              <span className="text-2xs text-destructive">{rowError(index)}</span>
            )}
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

          <div className="relative min-w-0">
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
              (() => {
                // Highlight {{tokens}} via a colored overlay behind a transparent
                // input — same trick as the URL bar. Skip when the value is masked.
                const masked = secret && item.secret && !reveal[index];
                const overlay = !masked;
                return (
                  <>
                    <input
                      ref={(el) => {
                        valueRefs.current[index] = el;
                      }}
                      type={masked ? "password" : "text"}
                      data-testid={testId ? `${testId}-value-${index}` : undefined}
                      placeholder={valuePlaceholder}
                      value={item.value}
                      onChange={(e) => {
                        update(index, "value", e.target.value);
                        setAcRow(index);
                        va.detect(e.target.value, e.target.selectionStart ?? e.target.value.length);
                      }}
                      onKeyUp={(e) => {
                        setAcRow(index);
                        va.detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
                      }}
                      onClick={(e) => {
                        setAcRow(index);
                        va.detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
                      }}
                      onBlur={() => setTimeout(va.close, 120)}
                      onKeyDown={(e) => {
                        if (acRow === index) {
                          va.onKeyDown(
                            e,
                            e.currentTarget.value,
                            e.currentTarget.selectionStart ?? 0,
                            applyValue(index),
                          );
                        }
                      }}
                      className={cn(
                        "relative z-[var(--z-raised)] w-full min-w-0 truncate bg-transparent font-mono text-code outline-none",
                        overlay ? "text-transparent caret-foreground" : "text-foreground",
                        !item.enabled && "opacity-50",
                      )}
                    />
                    {overlay && (
                      <div
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute inset-0 flex min-w-0 items-center overflow-hidden font-mono text-code",
                          !item.enabled && "opacity-50",
                        )}
                      >
                        <span className="truncate">
                          {item.value ? (
                            renderTokenText(item.value)
                          ) : (
                            <span className="text-[color:var(--text-placeholder)]">
                              {valuePlaceholder}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()
            )}
            {acRow === index && va.open && (
              <VarSuggestions
                items={va.items}
                index={va.index}
                onHover={va.setIndex}
                onPick={(name) => {
                  const el = valueRefs.current[index];
                  va.commit(
                    name,
                    el?.value ?? item.value,
                    el?.selectionStart ?? el?.value.length ?? 0,
                    applyValue(index),
                  );
                }}
                style={(() => {
                  // `position: fixed` so the popover escapes the editor's
                  // `overflow-hidden`; anchor to the input's viewport rect.
                  const r = valueRefs.current[index]?.getBoundingClientRect();
                  return r
                    ? { position: "fixed", top: r.bottom + 2, left: r.left, width: r.width }
                    : undefined;
                })()}
              />
            )}
          </div>

          {secret && (
            <div className="flex items-center justify-center gap-0.5">
              {item.secret && (
                <button
                  type="button"
                  aria-label={reveal[index] ? "Hide value" : "Reveal value"}
                  onClick={() => setReveal((r) => ({ ...r, [index]: !r[index] }))}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                >
                  {reveal[index] ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              <button
                type="button"
                aria-label={item.secret ? "Unmark secret" : "Mark secret"}
                onClick={() =>
                  onChange(items.map((it, i) => (i === index ? { ...it, secret: !it.secret } : it)))
                }
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded transition-colors",
                  item.secret ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.secret ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5 opacity-50" />
                )}
              </button>
            </div>
          )}

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
        {addLabel}
      </button>
    </div>
  );
}
