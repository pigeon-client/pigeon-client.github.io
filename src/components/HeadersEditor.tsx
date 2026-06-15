import { useEffect, useRef, useState } from "react";
import type { Header } from "../types";
import { KeyValueEditor } from "./KeyValueEditor";

interface HeadersEditorProps {
  headers: Header[];
  onHeadersChange: (headers: Header[]) => void;
}

const COMMON_HEADERS = [
  "Content-Type",
  "Accept",
  "Authorization",
  "Cache-Control",
  "Cookie",
  "User-Agent",
  "Referer",
  "Origin",
  "Accept-Language",
  "Accept-Encoding",
  "If-None-Match",
  "If-Modified-Since",
  "X-Requested-With",
  "X-API-Key",
  "X-Auth-Token",
  "X-CSRF-Token",
];

export function HeadersEditor({ headers, onHeadersChange }: HeadersEditorProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showForIndex, setShowForIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyChange = (index: number, value: string) => {
    let updated = headers.map((h, i) => (i === index ? { ...h, key: value } : h));
    if (index === updated.length - 1 && value !== "") {
      const last = updated[updated.length - 1];
      if (last.key !== "" || last.value !== "")
        updated = [...updated, { key: "", value: "", enabled: true }];
    }
    onHeadersChange(updated);
    if (value.length > 0) {
      const filtered = COMMON_HEADERS.filter((h) =>
        h.toLowerCase().startsWith(value.toLowerCase()),
      );
      setSuggestions(filtered);
      setShowForIndex(filtered.length > 0 ? index : null);
      setActiveIndex(-1);
    } else {
      setSuggestions([]);
      setShowForIndex(null);
    }
  };

  const selectSuggestion = (index: number, header: string) => {
    onHeadersChange(headers.map((h, i) => (i === index ? { ...h, key: header } : h)));
    setSuggestions([]);
    setShowForIndex(null);
    inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (showForIndex !== index || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((p) => Math.min(p + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(index, suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowForIndex(null);
      setSuggestions([]);
    }
  };

  const handleFocus = (index: number) => {
    const val = headers[index]?.key || "";
    if (val.length > 0) {
      const filtered = COMMON_HEADERS.filter((h) => h.toLowerCase().startsWith(val.toLowerCase()));
      setSuggestions(filtered);
      setShowForIndex(filtered.length > 0 ? index : null);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setShowForIndex(null);
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div>
      <KeyValueEditor
        items={headers}
        onChange={onHeadersChange}
        keyPlaceholder="Key"
        valuePlaceholder="Value"
        inputRefs={inputRefs}
        onKeyChange={handleKeyChange}
        onKeyDown={handleKeyDown}
        onKeyFocus={handleFocus}
        suggestions={suggestions}
        showForIndex={showForIndex}
        activeIndex={activeIndex}
        onSelectSuggestion={selectSuggestion}
      />

      {/* Auto-generated section */}
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: "var(--text-placeholder)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          margin: "16px 0 4px",
        }}
      >
        Auto-generated
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "28px 1fr 1.4fr 28px",
          alignItems: "center",
          height: 34,
          opacity: 0.62,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: "var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </span>
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}
        >
          Content-Type
        </span>
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}
        >
          application/json
        </span>
        <span
          style={{
            fontSize: 9,
            color: "var(--text-placeholder)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          auto
        </span>
      </div>
    </div>
  );
}
