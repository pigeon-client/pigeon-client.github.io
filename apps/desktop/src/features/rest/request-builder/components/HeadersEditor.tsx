import { useEffect, useRef, useState } from "react";
import { replaceRange } from "@/shared/lib/inputEdit";
import type { Header } from "@/shared/types";
import { VarKeyValueEditor } from "../../../environments/components/VarKeyValueEditor";

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
    // Overriding the key means this row is no longer just the folder default.
    let updated = headers.map((h, i) =>
      i === index ? { ...h, key: value, inherited: undefined } : h,
    );
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
    const field = inputRefs.current[index];
    if (field) {
      replaceRange(field, 0, field.value.length, header);
      field.focus();
    } else {
      onHeadersChange(
        headers.map((h, i) => (i === index ? { ...h, key: header, inherited: undefined } : h)),
      );
    }
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
      <VarKeyValueEditor
        items={headers}
        onChange={onHeadersChange}
        keyPlaceholder="Key"
        valuePlaceholder="Value"
        testId="header"
        addLabel="Add header"
        inputRefs={inputRefs}
        onKeyChange={handleKeyChange}
        onKeyDown={handleKeyDown}
        onKeyFocus={handleFocus}
        suggestions={suggestions}
        showForIndex={showForIndex}
        activeIndex={activeIndex}
        onSelectSuggestion={selectSuggestion}
      />
    </div>
  );
}
