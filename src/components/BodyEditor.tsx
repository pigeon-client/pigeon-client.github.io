import hljs from "highlight.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { HighlightedHtml } from "@/shared/ui/HighlightedHtml";
import { useAutoClose } from "../hooks/useAutoClose";
import type { BodyType, KeyValue } from "../types";
import { KeyValueEditor } from "./KeyValueEditor";

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
      className="pointer-events-none absolute inset-0 overflow-auto px-4 pb-1.5"
    >
      <pre className="m-0 whitespace-pre-wrap break-words bg-transparent font-mono text-[13px] leading-[21px]">
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
      className="w-[46px] shrink-0 select-none overflow-hidden pr-4 text-right font-mono text-[12.5px] leading-[21px] text-muted-foreground"
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
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Type selector row */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
        {BODY_TYPES.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => handleRadioSelect(t.id)}
            className={cn(
              "inline-flex h-6.5 cursor-pointer items-center rounded border px-2.5 text-xs transition-colors",
              activeRadio === t.id
                ? "border-primary/40 bg-primary/15 font-semibold text-primary"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {activeRadio === t.id && t.id === "json" && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-status-2xx" />
            )}
          </button>
        ))}
        <div className="flex-1" />
        {isCodeEditor && (
          <Button variant="ghost" size="xs" onClick={formatJson} className="gap-1.5">
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
            className="h-6.5 cursor-pointer appearance-none rounded border border-border bg-card px-2.5 font-[inherit] text-[11.5px] text-foreground outline-none"
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
      <div className="flex min-h-0 flex-1 flex-col py-2">
        {activeRadio === "none" && (
          <div className="px-6 py-6 text-center text-xs text-muted-foreground">
            This request does not have a body
          </div>
        )}

        {isCodeEditor && (
          <div className="flex min-h-0 flex-1">
            <LineNumbers count={lineCount} scrollRef={lineNumRef} />
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <HighlightLayer code={body} language={language} scrollRef={highlightRef} />
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
                className="absolute inset-0 z-[1] resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent px-4 pb-1.5 font-mono text-[13px] leading-[21px] text-transparent caret-foreground outline-none"
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
        )}

        {activeRadio === "x-www-form-urlencoded" && (
          <div className="px-4">
            <KeyValueEditor
              items={formData}
              onChange={onFormDataChange}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
            />
          </div>
        )}

        {activeRadio === "form-data" && (
          <div className="px-4">
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
          <div className="flex items-center gap-3 px-4">
            <label className="inline-flex cursor-pointer">
              <div className="inline-flex h-8 items-center gap-1.5 rounded border border-border px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
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
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFileChange(f);
                }}
              />
            </label>
            {file && (
              <>
                <span className="text-[11px] text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  onClick={() => onFileChange(null)}
                  className="bg-transparent font-[inherit] text-xs text-destructive"
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
