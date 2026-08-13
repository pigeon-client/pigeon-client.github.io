import { Tooltip } from "@pigeon/ui";
import { Eye, EyeOff, FolderTree, Lock, Paperclip, Unlock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderTokenText } from "@/shared/lib/renderTokenText";
import { cn } from "@/shared/lib/utils";
import type { KeyValue } from "@/shared/types";
import type { ApplyValueFn, ValueAutocomplete } from "./autocomplete";

export interface KeyValueEditorProps {
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
  /** `{{variable}}` autocomplete for value fields, injected by the consumer
   *  (use `VarKeyValueEditor` from features/environments). Absent → no popover. */
  autocomplete?: ValueAutocomplete;
  /** Resolve env token names for hover tooltips on `{{tokens}}` in value fields. */
  resolveToken?: (name: string) => string | undefined;
  /** Override key column text color (default: HTTP-method green for params/headers). */
  keyClassName?: string;
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
  autocomplete: va,
  resolveToken,
  keyClassName = "text-method-get",
}: KeyValueEditorProps) {
  const [reveal, setReveal] = useState<Record<number, boolean>>({});
  const [acRow, setAcRow] = useState<number | null>(null);
  const valueRefs = useRef<(HTMLInputElement | null)[]>([]);
  const valueOverlayRefs = useRef<(HTMLDivElement | null)[]>([]);
  // minmax(0,…) so long keys/values shrink inside the panel instead of expanding it.
  // Trailing col is fixed (52px = inherit slot + trash) so rows with/without the
  // inherited icon keep identical column tracks — `auto` caused a horizontal shift.
  const cols = secret
    ? "grid-cols-[28px_minmax(0,1fr)_minmax(0,1.4fr)_52px_52px]"
    : "grid-cols-[28px_minmax(0,1fr)_minmax(0,1.4fr)_52px]";

  const syncValueOverlayScroll = (index: number) => {
    const input = valueRefs.current[index];
    const overlay = valueOverlayRefs.current[index];
    if (!(input && overlay)) return;
    if (overlay.scrollLeft !== input.scrollLeft) {
      overlay.scrollLeft = input.scrollLeft;
    }
  };

  useEffect(() => {
    if (items.length === 0) onChange([{ key: "", value: "", enabled: true }]);
  }, [onChange, items.length]);

  // Re-sync overlays after value text changes (paste / store write) — caret scroll
  // may land before the overlay's content width updates.
  useEffect(() => {
    requestAnimationFrame(() => {
      for (let i = 0; i < items.length; i++) syncValueOverlayScroll(i);
    });
  }, [items]);

  const itemsWithKeys = useMemo(
    () => items.map((item, i) => ({ ...item, _rowKey: `row-${i}` })),
    [items],
  );

  const update = (index: number, field: "key" | "value" | "enabled", val: string | boolean) => {
    // Editing a row's key/value means the user is now overriding it, not just
    // viewing a folder default — drop the "inherited" marker (toggling enabled
    // doesn't change where the value came from, so that one leaves it be).
    const clearInherited = field !== "enabled" ? { inherited: undefined } : {};
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: val, ...clearInherited } : item,
    );
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
    <div className="min-w-0">
      {/* Column headers */}
      <div
        className={cn(
          "grid min-w-0 gap-0 border-b border-border/60 pb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground",
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
          className={cn(
            "grid min-h-9 min-w-0 items-center rounded-sm transition-colors hover:bg-muted/20",
            cols,
          )}
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
                "w-full min-w-0 bg-transparent font-mono text-code outline-none placeholder:text-muted-foreground/60",
                rowError?.(index) ? "text-destructive" : keyClassName,
                !item.enabled && "opacity-50",
              )}
            />
            {rowError?.(index) && (
              <span className="text-2xs text-destructive">{rowError(index)}</span>
            )}
            {showForIndex === index && suggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-popover max-h-[220px] overflow-y-auto rounded border border-border bg-popover shadow-lg">
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
                        va?.detect(
                          e.target.value,
                          e.target.selectionStart ?? e.target.value.length,
                        );
                      }}
                      onScroll={() => syncValueOverlayScroll(index)}
                      onSelect={() => syncValueOverlayScroll(index)}
                      onWheel={(e) => {
                        // Text inputs often ignore trackpad/wheel; scroll horizontally so
                        // the caret (and synced overlay) can reach the end of long values.
                        const el = e.currentTarget;
                        if (el.scrollWidth <= el.clientWidth) return;
                        const dx =
                          Math.abs(e.deltaX) >= Math.abs(e.deltaY)
                            ? e.deltaX
                            : e.shiftKey
                              ? e.deltaY
                              : 0;
                        if (dx === 0) return;
                        const max = el.scrollWidth - el.clientWidth;
                        const next = Math.max(0, Math.min(max, el.scrollLeft + dx));
                        if (next === el.scrollLeft) return;
                        e.preventDefault();
                        el.scrollLeft = next;
                        syncValueOverlayScroll(index);
                      }}
                      onKeyUp={(e) => {
                        syncValueOverlayScroll(index);
                        setAcRow(index);
                        va?.detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
                      }}
                      onClick={(e) => {
                        syncValueOverlayScroll(index);
                        setAcRow(index);
                        va?.detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
                      }}
                      onBlur={() => va && setTimeout(va.close, 120)}
                      onKeyDown={(e) => {
                        if (va && acRow === index) {
                          const el = e.currentTarget;
                          const caret = el.selectionStart ?? el.value.length;
                          const apply: ApplyValueFn = (next, newCaret) => {
                            update(index, "value", next);
                            requestAnimationFrame(() => {
                              el.focus();
                              el.setSelectionRange(newCaret, newCaret);
                              syncValueOverlayScroll(index);
                            });
                          };
                          if (va.onKeyDown(e, el.value, caret, apply)) {
                            syncValueOverlayScroll(index);
                          }
                        }
                      }}
                      className={cn(
                        "relative z-raised w-full min-w-0 bg-transparent font-mono text-code outline-none",
                        overlay ? "text-transparent caret-foreground" : "text-foreground",
                        !item.enabled && "opacity-50",
                      )}
                    />
                    {overlay && (
                      <div
                        ref={(el) => {
                          valueOverlayRefs.current[index] = el;
                        }}
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute inset-0 z-raised overflow-hidden font-mono text-code",
                          !item.enabled && "opacity-50",
                        )}
                      >
                        <div className="flex h-full min-w-max items-center whitespace-nowrap">
                          {item.value ? (
                            renderTokenText(item.value, resolveToken)
                          ) : (
                            <span className="text-[color:var(--text-placeholder)]">
                              {valuePlaceholder}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()
            )}
            {va && acRow === index && va.open && (
              <va.Suggestions
                items={va.items}
                index={va.index}
                onHover={va.setIndex}
                onPick={(name) => {
                  const el = valueRefs.current[index];
                  if (el) {
                    const caret = el.selectionStart ?? el.value.length;
                    const apply: ApplyValueFn = (next, newCaret) => {
                      update(index, "value", next);
                      requestAnimationFrame(() => {
                        el.focus();
                        el.setSelectionRange(newCaret, newCaret);
                        syncValueOverlayScroll(index);
                      });
                    };
                    va.commit(name, el.value, caret, apply);
                    syncValueOverlayScroll(index);
                  }
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

          <div className="flex w-full items-center justify-end gap-0.5">
            {/* Always reserve the slot so non-inherited rows don't shift columns. */}
            {item.inherited ? (
              <Tooltip label="Inherited" side="top">
                <button
                  type="button"
                  aria-label="Inherited"
                  className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  <FolderTree className="h-3 w-3" aria-hidden="true" />
                </button>
              </Tooltip>
            ) : (
              <span className="invisible pointer-events-none flex h-6 w-6 shrink-0" aria-hidden />
            )}
            <button
              type="button"
              aria-label="Remove row"
              onClick={() => remove(index)}
              className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
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
