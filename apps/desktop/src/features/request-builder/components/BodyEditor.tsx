import hljs from "highlight.js";
import { Check, ChevronDown, WrapText } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { VarSuggestions } from "@/features/environments/components/VarSuggestions";
import { useVarAutocomplete } from "@/features/environments/hooks/useVarAutocomplete";
import { useWordWrap } from "@/features/settings/hooks/useWordWrap";
import {
  BINARY_BODY_FORMATS,
  bodyUiGroup,
  highlightLanguageFor,
  RAW_BODY_FORMATS,
} from "@/shared/lib/contentType";
import { cn } from "@/shared/lib/utils";
import type { BodyType, KeyValue } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { HighlightedHtml } from "@/shared/ui/HighlightedHtml";
import { useAutoClose } from "../hooks/useAutoClose";
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

const LINE_HEIGHT = 21;

function radioFromBodyType(bodyType: BodyType): RadioId {
  const group = bodyUiGroup(bodyType);
  if (group === "none") return "none";
  if (group === "json") return "json";
  if (group === "form-data") return "form-data";
  if (group === "urlencoded") return "x-www-form-urlencoded";
  if (group === "binary") return "binary";
  return "raw";
}

function defaultRawFormat(bodyType: BodyType): BodyType {
  return bodyUiGroup(bodyType) === "raw" ? bodyType : "text/plain";
}

function defaultBinaryFormat(bodyType: BodyType): BodyType {
  return bodyUiGroup(bodyType) === "binary" ? bodyType : "application/octet-stream";
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
  wrap,
  scrollRef,
}: {
  code: string;
  language: string;
  wrap: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const highlighted = useMemo(() => hljsHighlight(code, language), [code, language]);

  return (
    <div
      ref={scrollRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-auto px-4 pb-1.5"
    >
      <pre
        className={cn(
          "m-0 bg-transparent font-mono text-code leading-[21px]",
          wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        )}
      >
        <HighlightedHtml
          html={highlighted}
          className={language ? `language-${language} hljs` : "hljs"}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-code)",
            lineHeight: `${LINE_HEIGHT}px`,
            background: "transparent",
          }}
        />
      </pre>
    </div>
  );
}

function LineNumbers({
  count,
  heights,
  scrollRef,
}: {
  count: number;
  /** Per-logical-line pixel heights when word-wrap is on; omitted = fixed 21px. */
  heights?: number[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const lines = Array.from({ length: Math.max(count, 1) }, (_, i) => i + 1);
  return (
    <div
      ref={scrollRef}
      className="w-[46px] shrink-0 select-none overflow-hidden pr-4 text-right font-mono text-xs leading-[21px] text-muted-foreground"
    >
      {lines.map((lineNum, i) => (
        <div key={lineNum} style={{ height: heights?.[i] ?? LINE_HEIGHT }}>
          {lineNum}
        </div>
      ))}
    </div>
  );
}

/** Measure each logical line's wrapped height so the gutter stays aligned. */
function measureWrappedLineHeights(text: string, widthPx: number): number[] {
  if (widthPx <= 0) return text.split("\n").map(() => LINE_HEIGHT);
  const measure = document.createElement("div");
  measure.style.cssText = [
    "position:absolute",
    "visibility:hidden",
    "pointer-events:none",
    `width:${widthPx}px`,
    "font-family:var(--font-mono)",
    "font-size:var(--text-code)",
    `line-height:${LINE_HEIGHT}px`,
    "white-space:pre-wrap",
    "overflow-wrap:break-word",
    "word-break:break-word",
  ].join(";");
  document.body.appendChild(measure);
  const heights = text.split("\n").map((line) => {
    measure.textContent = line.length > 0 ? line : " ";
    return Math.max(LINE_HEIGHT, measure.offsetHeight);
  });
  document.body.removeChild(measure);
  return heights;
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
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const { handleKeyDown } = useAutoClose(textareaRef);
  const va = useVarAutocomplete();
  const { wordWrap, setWordWrap } = useWordWrap();
  const [lineHeights, setLineHeights] = useState<number[] | undefined>();
  const applyBody = (next: string, caret: number) => {
    onBodyChange(next);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    });
  };
  const activeRadio = radioFromBodyType(bodyType);
  const [rawFormat, setRawFormat] = useState<BodyType>(() => defaultRawFormat(bodyType));
  const [binaryFormat, setBinaryFormat] = useState<BodyType>(() => defaultBinaryFormat(bodyType));
  const [rawFormatOpen, setRawFormatOpen] = useState(false);
  const [binaryFormatOpen, setBinaryFormatOpen] = useState(false);
  const rawFormatRef = useRef<HTMLDivElement>(null);
  const binaryFormatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyUiGroup(bodyType) === "raw") setRawFormat(bodyType);
    if (bodyUiGroup(bodyType) === "binary") setBinaryFormat(bodyType);
  }, [bodyType]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!(rawFormatOpen || binaryFormatOpen)) return;
    const handler = (e: MouseEvent) => {
      if (rawFormatRef.current && !rawFormatRef.current.contains(e.target as Node)) {
        setRawFormatOpen(false);
      }
      if (binaryFormatRef.current && !binaryFormatRef.current.contains(e.target as Node)) {
        setBinaryFormatOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [rawFormatOpen, binaryFormatOpen]);

  const handleRadioSelect = (id: RadioId) => {
    if (id === "none") onBodyTypeChange("none");
    else if (id === "json") onBodyTypeChange("application/json");
    else if (id === "form-data") onBodyTypeChange("multipart/form-data");
    else if (id === "x-www-form-urlencoded") onBodyTypeChange("application/x-www-form-urlencoded");
    else if (id === "raw") onBodyTypeChange(rawFormat);
    else if (id === "binary") onBodyTypeChange(binaryFormat);
  };

  const formatJson = () => {
    if (
      (bodyType === "application/json" ||
        bodyType === "application/problem+json" ||
        bodyType === "application/graphql+json") &&
      body
    ) {
      try {
        onBodyChange(JSON.stringify(JSON.parse(body), null, 2));
      } catch {}
    }
  };

  const isCodeEditor = activeRadio === "json" || activeRadio === "raw";
  const lineCount = body ? body.split("\n").length : 1;
  const canPrettyJson =
    bodyType === "application/json" ||
    bodyType === "application/problem+json" ||
    bodyType === "application/graphql+json";
  const language = highlightLanguageFor(bodyType);

  // Keep gutter heights in sync when wrap is on (long lines take >1 visual row).
  useLayoutEffect(() => {
    if (!(isCodeEditor && wordWrap)) {
      setLineHeights(undefined);
      return;
    }
    const pane = editorPaneRef.current;
    if (!pane) return;

    const update = () => {
      // textarea px-4 = 16px each side
      const width = Math.max(0, pane.clientWidth - 32);
      setLineHeights(measureWrappedLineHeights(body, width));
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(pane);
    return () => ro.disconnect();
  }, [body, wordWrap, isCodeEditor]);

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (lineNumRef.current) lineNumRef.current.scrollTop = ta.scrollTop;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Type selector row */}
      <div className="flex flex-shrink-0 items-center justify-between gap-1.5 border-b border-border px-4 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
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
            </button>
          ))}
          {activeRadio === "raw" && (
            <div className="relative shrink-0" ref={rawFormatRef}>
              <button
                type="button"
                onClick={() => setRawFormatOpen((o) => !o)}
                title={RAW_BODY_FORMATS.find((f) => f.value === rawFormat)?.spec}
                className={cn(
                  "inline-flex h-6.5 cursor-pointer items-center gap-1.5 rounded border px-2.5 text-xs transition-colors",
                  rawFormatOpen
                    ? "border-primary/40 bg-primary/15 font-semibold text-primary"
                    : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                {RAW_BODY_FORMATS.find((f) => f.value === rawFormat)?.label ?? "Raw"}
                <ChevronDown className="h-3 w-3" />
              </button>

              {rawFormatOpen && (
                <div className="absolute left-0 top-8 z-[var(--z-dropdown)] max-h-72 w-[220px] overflow-auto rounded border border-border bg-popover p-1 shadow-lg">
                  {RAW_BODY_FORMATS.map((f) => (
                    <Button
                      key={f.value}
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setRawFormat(f.value);
                        onBodyTypeChange(f.value);
                        setRawFormatOpen(false);
                      }}
                      className={cn(
                        "w-full justify-between",
                        f.value === rawFormat ? "text-primary" : "text-foreground",
                      )}
                      title={f.spec}
                    >
                      <span className="truncate">{f.label}</span>
                      {f.value === rawFormat && <Check className="h-3 w-3 shrink-0" />}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeRadio === "binary" && (
            <div className="relative shrink-0" ref={binaryFormatRef}>
              <button
                type="button"
                onClick={() => setBinaryFormatOpen((o) => !o)}
                title={BINARY_BODY_FORMATS.find((f) => f.value === binaryFormat)?.spec}
                className={cn(
                  "inline-flex h-6.5 cursor-pointer items-center gap-1.5 rounded border px-2.5 text-xs transition-colors",
                  binaryFormatOpen
                    ? "border-primary/40 bg-primary/15 font-semibold text-primary"
                    : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                {BINARY_BODY_FORMATS.find((f) => f.value === binaryFormat)?.label ?? "Octet Stream"}
                <ChevronDown className="h-3 w-3" />
              </button>

              {binaryFormatOpen && (
                <div className="absolute left-0 top-8 z-[var(--z-dropdown)] max-h-72 w-[220px] overflow-auto rounded border border-border bg-popover p-1 shadow-lg">
                  {BINARY_BODY_FORMATS.map((f) => (
                    <Button
                      key={f.value}
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setBinaryFormat(f.value);
                        onBodyTypeChange(f.value);
                        setBinaryFormatOpen(false);
                      }}
                      className={cn(
                        "w-full justify-between",
                        f.value === binaryFormat ? "text-primary" : "text-foreground",
                      )}
                      title={f.spec}
                    >
                      <span className="truncate">{f.label}</span>
                      {f.value === binaryFormat && <Check className="h-3 w-3 shrink-0" />}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isCodeEditor && (
            <Button
              variant="ghost"
              size="icon"
              data-testid="body-wrap-toggle"
              onClick={() => setWordWrap(!wordWrap)}
              aria-pressed={wordWrap}
              title={wordWrap ? "Word wrap: on" : "Word wrap: off"}
              className={wordWrap ? "text-primary" : undefined}
            >
              <WrapText className="h-3.5 w-3.5" />
            </Button>
          )}
          {canPrettyJson && (
            <Button variant="ghost" size="xs" onClick={formatJson} className="shrink-0 gap-1.5">
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
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col py-2">
        {activeRadio === "none" && (
          <div className="px-6 py-6 text-center text-xs text-muted-foreground">
            This request does not have a body
          </div>
        )}

        {isCodeEditor && (
          <div className="relative flex min-h-0 flex-1">
            <LineNumbers count={lineCount} heights={lineHeights} scrollRef={lineNumRef} />
            {va.open && (
              <VarSuggestions
                items={va.items}
                index={va.index}
                onHover={va.setIndex}
                onPick={(name) => {
                  const ta = textareaRef.current;
                  va.commit(name, ta?.value ?? body, ta?.selectionStart ?? body.length, applyBody);
                }}
                className="left-[46px] top-2"
              />
            )}
            <div ref={editorPaneRef} className="relative min-h-0 flex-1 overflow-hidden">
              <HighlightLayer
                code={body}
                language={language}
                wrap={wordWrap}
                scrollRef={highlightRef}
              />
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => {
                  onBodyChange(e.target.value);
                  va.detect(e.target.value, e.target.selectionStart ?? e.target.value.length);
                }}
                onKeyUp={(e) =>
                  va.detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
                }
                onClick={(e) =>
                  va.detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
                }
                onBlur={() => setTimeout(va.close, 120)}
                onScroll={handleScroll}
                onKeyDown={(e) => {
                  if (
                    va.onKeyDown(
                      e,
                      e.currentTarget.value,
                      e.currentTarget.selectionStart ?? 0,
                      applyBody,
                    )
                  ) {
                    return;
                  }
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
                className={cn(
                  "absolute inset-0 z-[var(--z-raised)] resize-none overflow-auto bg-transparent px-4 pb-1.5 font-mono text-code leading-[21px] text-transparent caret-foreground outline-none",
                  wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
                )}
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
          <div className="flex flex-col gap-3 px-4">
            <div className="flex items-center gap-3">
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
                    if (!f) return;
                    onFileChange(f);
                    // Auto-adopt file MIME when still on generic octet-stream (curl @file + CT).
                    if (
                      binaryFormat === "application/octet-stream" &&
                      f.type &&
                      BINARY_BODY_FORMATS.some((fmt) => fmt.value === f.type)
                    ) {
                      const next = f.type as BodyType;
                      setBinaryFormat(next);
                      onBodyTypeChange(next);
                    }
                  }}
                />
              </label>
              {file && (
                <>
                  <span className="text-2xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                    {file.type ? ` · ${file.type}` : ""}
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
            <p className="text-2xs text-muted-foreground">
              Sends as <span className="font-mono text-foreground">{bodyType}</span>
              {" · "}
              {BINARY_BODY_FORMATS.find((f) => f.value === binaryFormat)?.spec}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
