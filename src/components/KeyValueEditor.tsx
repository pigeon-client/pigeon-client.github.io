import { Paperclip } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { KeyValue } from "../types";

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
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
    <button
      type="button"
      aria-label={on ? "Disable row" : "Enable row"}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        borderRadius: 4,
        background: on ? "var(--accent)" : "transparent",
        border: on ? "none" : "1.5px solid var(--border)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "all 0.1s",
        padding: 0,
      }}
    >
      {on && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
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
    () => items.map((item, i) => ({ ...item, _rowKey: `row-${i}-${item.key}` })),
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "28px 1fr 1.4fr 28px",
          gap: 0,
          fontSize: 10.5,
          fontWeight: 600,
          color: "var(--text-placeholder)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "0 0 8px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span />
        <span>Key</span>
        <span>Value</span>
        <span />
      </div>

      {itemsWithKeys.map((item, index) => (
        <div
          key={item._rowKey}
          style={{
            display: "grid",
            gridTemplateColumns: "28px 1fr 1.4fr 28px",
            alignItems: "center",
            height: 36,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Checkbox on={item.enabled} onClick={() => update(index, "enabled", !item.enabled)} />
          </span>

          <div style={{ position: "relative" }}>
            <input
              ref={(el) => {
                if (inputRefs) inputRefs.current[index] = el;
              }}
              type="text"
              placeholder={keyPlaceholder}
              value={item.key}
              onChange={(e) =>
                onKeyChange
                  ? onKeyChange(index, e.target.value)
                  : update(index, "key", e.target.value)
              }
              onKeyDown={(e) => onKeyDown?.(e, index)}
              onFocus={() => onKeyFocus?.(index)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "#4A9EFA",
                opacity: item.enabled ? 1 : 0.5,
              }}
            />
            {showForIndex === index && suggestions && suggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "100%",
                  zIndex: 50,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {suggestions.map((s, i) => (
                  <button
                    type="button"
                    key={s}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectSuggestion?.(index, s);
                    }}
                    style={{
                      width: "100%",
                      padding: "6px 12px",
                      textAlign: "left",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      background: i === activeIndex ? "rgba(124,110,250,0.15)" : "transparent",
                      color: i === activeIndex ? "var(--accent)" : "var(--text-primary)",
                      border: "none",
                      cursor: "pointer",
                    }}
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontFamily: "inherit",
                  color: "inherit",
                }}
                onClick={() => pickFile(index)}
              >
                <Paperclip size={12} style={{ color: "var(--accent)" }} />
                <span
                  style={{
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.fileName}
                </span>
              </button>
            ) : (
              <input
                type="text"
                placeholder={valuePlaceholder}
                value={item.value}
                onChange={(e) => update(index, "value", e.target.value)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  opacity: item.enabled ? 1 : 0.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              />
            )}
          </div>

          <button
            type="button"
            aria-label="Remove row"
            onClick={() => remove(index)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-placeholder)",
              cursor: "pointer",
              transition: "color 0.1s",
            }}
            className="hover:text-[#F87171]"
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
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginTop: 10,
          background: "transparent",
          border: "none",
          color: "var(--text-secondary)",
          fontFamily: "inherit",
          fontSize: 12.5,
          fontWeight: 500,
          cursor: "pointer",
          padding: 0,
        }}
        className="hover:text-[var(--accent)]"
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
