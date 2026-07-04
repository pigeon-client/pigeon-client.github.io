import { useEffect, useRef, useState } from "react";
import type { Header } from "@/shared/types";
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
      <div className="mb-1 mt-4 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Auto-generated
      </div>
      <div className="grid h-8.5 grid-cols-[28px_1fr_1.4fr_28px] items-center opacity-60">
        <span className="flex items-center justify-center">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-muted">
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-muted-foreground"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </span>
        <span className="font-mono text-code text-muted-foreground">Content-Type</span>
        <span className="font-mono text-code text-muted-foreground">application/json</span>
        <span className="text-2xs uppercase tracking-wide text-muted-foreground">auto</span>
      </div>
    </div>
  );
}
