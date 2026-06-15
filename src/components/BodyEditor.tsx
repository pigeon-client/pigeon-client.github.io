import hljs from "highlight.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoClose } from "../hooks/useAutoClose";
import type { BodyType, KeyValue } from "../types";
import { KeyValueEditor } from "./KeyValueEditor";
import { Button } from "./ui/Button";
import { HighlightedHtml } from "./ui/HighlightedHtml";

interface BodyEditorProps {
  bodyType: BodyType;
  body: string;
  formData: KeyValue[];
  multipart: KeyValue[];
  file: File | null;
  onBodyChange: (body: string) => void;
  onFormDataChange: (data: KeyValue[]) => void;
  onBodyTypeChange: (type: BodyType) => void;
  onMultipartChange: (data: KeyValue[]) => void;
  onFileChange: (file: File | null) => void;
}

type RadioId = "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary";

const BODY_TYPES: { id: RadioId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "json", label: "JSON" },
  { id: "raw", label: "Raw" },
  { id: "form-data", label: "Form Data" },
  { id: "x-www-form-urlencoded", label: "URL Encoded" },
  { id: "binary", label: "Binary" },
];

const RAW_FORMATS: { label: string; value: BodyType }[] = [
  { label: "Text", value: "text/plain" },
  { label: "XML", value: "text/xml" },
];

function getActiveRadio(bodyType: BodyType): RadioId {
  if (bodyType === "none") return "none";
  if (bodyType === "application/json") return "json";
  if (bodyType === "multipart/form-data") return "form-data";
  if (bodyType === "application/x-www-form-urlencoded") return "x-www-form-urlencoded";
  if (["text/plain", "text/xml"].includes(bodyType)) return "raw";
  if (bodyType === "application/octet-stream") return "binary";
  return "none";
}

function hljsHighlight(code: string, language: string): string {
  if (!code) return "";
  try {
    if (language) return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  } catch {
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

/* ── Syntax-highlighted code layer ── */
function HighlightLayer({
  code,
  language,
  scrollRef,
}: {
  code: string;
  language: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const highlighted = useMemo(() => hljsHighlight(code, language), [code, language]);

  return (
    <div
      ref={scrollRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        padding: "0 18px 6px 0",
      }}
    >
      <pre
        style={{
          margin: 0,
          padding: 0,
          background: "transparent",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: "21px",
          whiteSpace: "pre",
          wordBreak: "normal",
          overflow: "visible",
        }}
      >
        <HighlightedHtml
          html={highlighted}
          className={language ? `language-${language} hljs` : "hljs"}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: "21px",
            background: "transparent",
          }}
        />
      </pre>
    </div>
  );
}

/* ── Line numbers ── */
function LineNumbers({
  count,
  scrollRef,
}: {
  count: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const lines = Array.from({ length: Math.max(count, 1) }, (_, i) => i + 1);
  return (
    <div
      ref={scrollRef}
      style={{
        flexShrink: 0,
        width: 46,
        textAlign: "right",
        paddingRight: 18,
        color: "var(--text-placeholder)",
        userSelect: "none",
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        lineHeight: "21px",
        overflow: "hidden",
      }}
    >
      {lines.map((lineNum) => (
        <div key={lineNum} style={{ height: 21 }}>
          {lineNum}
        </div>
      ))}
    </div>
  );
}

export function BodyEditor({
  bodyType,
  body,
  formData,
  multipart,
  file,
  onBodyChange,
  onFormDataChange,
  onBodyTypeChange,
  onMultipartChange,
  onFileChange,
}: BodyEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const { handleKeyDown } = useAutoClose(textareaRef);
  const activeRadio = getActiveRadio(bodyType);
  const [rawFormat, setRawFormat] = useState<BodyType>(
    ["text/plain", "text/xml"].includes(bodyType) ? bodyType : "text/plain",
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleRadioSelect = (id: RadioId) => {
    if (id === "none") onBodyTypeChange("none");
    else if (id === "json") onBodyTypeChange("application/json");
    else if (id === "form-data") onBodyTypeChange("multipart/form-data");
    else if (id === "x-www-form-urlencoded") onBodyTypeChange("application/x-www-form-urlencoded");
    else if (id === "raw") onBodyTypeChange(rawFormat);
    else if (id === "binary") onBodyTypeChange("application/octet-stream");
  };

  const formatJson = () => {
    if (bodyType === "application/json" && body) {
      try {
        onBodyChange(JSON.stringify(JSON.parse(body), null, 2));
      } catch {}
    }
  };

  const isCodeEditor = activeRadio === "json" || activeRadio === "raw";
  const lineCount = body ? body.split("\n").length : 1;

  /* Sync scroll: textarea → line numbers + highlight layer */
  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (lineNumRef.current) lineNumRef.current.scrollTop = ta.scrollTop;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
  }, []);

  const language =
    activeRadio === "json"
      ? "json"
      : activeRadio === "raw" && rawFormat === "text/xml"
        ? "xml"
        : "";

  return (
    <div>
      {/* Type selector row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 18px",
          borderBottom: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        {BODY_TYPES.map((t) => {
          const active = activeRadio === t.id;
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => handleRadioSelect(t.id)}
              style={{
                height: 26,
                display: "inline-flex",
                alignItems: "center",
                padding: "0 11px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                background: active
                  ? "color-mix(in srgb, var(--accent) 16%, transparent)"
                  : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
                border: active
                  ? "1px solid color-mix(in srgb, var(--accent) 40%, transparent)"
                  : "1px solid transparent",
                transition: "all 0.1s",
                fontFamily: "inherit",
              }}
            >
              {t.label}
              {active && t.id === "json" && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#4ADE80",
                    display: "inline-block",
                    marginLeft: 4,
                  }}
                />
              )}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {isCodeEditor && (
          <Button variant="ghost" size="xs" onClick={formatJson} style={{ gap: 6 }}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 7V4h16v3M9 20h6M12 4v16" />
            </svg>
            Format
          </Button>
        )}
        {activeRadio === "raw" && (
          <select
            value={rawFormat}
            onChange={(e) => {
              const fmt = e.target.value as BodyType;
              setRawFormat(fmt);
              onBodyTypeChange(fmt);
            }}
            style={{
              appearance: "none",
              height: 26,
              padding: "0 10px",
              fontSize: 11.5,
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {RAW_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "8px 0" }}>
        {activeRadio === "none" && (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            This request does not have a body
          </div>
        )}

        {isCodeEditor && (
          <div style={{ display: "flex", minHeight: 120 }}>
            {/* Line numbers */}
            <LineNumbers count={lineCount} scrollRef={lineNumRef} />

            {/* Editor + highlight layer */}
            <div style={{ flex: 1, position: "relative" }}>
              {/* Syntax-highlighted background */}
              <HighlightLayer code={body} language={language} scrollRef={highlightRef} />

              {/* Transparent textarea on top */}
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const ta = textareaRef.current;
                    if (!ta) return;
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    const newVal = `${body.slice(0, start)}  ${body.slice(end)}`;
                    onBodyChange(newVal);
                    requestAnimationFrame(() => {
                      ta.selectionStart = ta.selectionEnd = start + 2;
                    });
                  }
                }}
                placeholder={
                  activeRadio === "json" ? '{\n  "key": "value"\n}' : "Enter request body..."
                }
                spellCheck={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  lineHeight: "21px",
                  /* text is transparent — only the caret is visible */
                  color: "transparent",
                  caretColor: "var(--text-primary)",
                  padding: "0 18px 6px 0",
                  tabSize: 2,
                  overflow: "auto",
                  zIndex: 1,
                }}
              />
            </div>
          </div>
        )}

        {activeRadio === "x-www-form-urlencoded" && (
          <div style={{ padding: "0 18px" }}>
            <KeyValueEditor
              items={formData}
              onChange={onFormDataChange}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
            />
          </div>
        )}

        {activeRadio === "form-data" && (
          <div style={{ padding: "0 18px" }}>
            <KeyValueEditor
              items={multipart}
              onChange={onMultipartChange}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
              showFilePicker
            />
          </div>
        )}

        {activeRadio === "binary" && (
          <div style={{ padding: "0 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ cursor: "pointer", display: "inline-flex" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 500,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.1s",
                  fontFamily: "inherit",
                }}
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {file ? file.name : "Select File"}
              </div>
              <input
                type="file"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFileChange(f);
                }}
              />
            </label>
            {file && (
              <>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  onClick={() => onFileChange(null)}
                  style={{
                    fontSize: 12,
                    color: "#F87171",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Remove
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
