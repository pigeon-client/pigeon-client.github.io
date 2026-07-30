import hljs from "highlight.js";
import { Download, FileCode, Send, WrapText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cancelTabStream, getTabStreamId, isEventStreamContentType } from "@/features/execution";
import { cancelSseStream } from "@/features/execution/services/sseClient";
import { generateCurl } from "@/features/import-export";
import { useTabStore } from "@/features/request-builder";
import { useWordWrap } from "@/features/settings/hooks/useWordWrap";
import {
  classifyResponse,
  highlightLanguageFor,
  type ResponseKind,
  responseKindLabel,
} from "@/shared/lib/contentType";
import { findMatches } from "@/shared/lib/textFind";
import { Button } from "@/shared/ui/button";
import { FindBar } from "@/shared/ui/FindBar";
import { HighlightedHtml } from "@/shared/ui/HighlightedHtml";
import { Tab } from "@/shared/ui/tabs-shim";
import { SseEventList } from "./SseEventList";
import { StatusEmptyBody } from "./StatusEmptyBody";

function formatBody(body: number[]): string {
  return new TextDecoder().decode(new Uint8Array(body));
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "var(--status-2xx)";
  if (status >= 300 && status < 400) return "var(--status-3xx)";
  if (status >= 400 && status < 500) return "var(--status-4xx)";
  if (status >= 500) return "var(--status-5xx)";
  return "var(--text-secondary)";
}

function hljsHighlight(code: string, language: string): string {
  if (!code) return "";
  try {
    if (language) return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    return hljs.highlightAuto(code).value;
  } catch {
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

function MediaPane({
  kind,
  contentType,
  bodyBytes,
  responseSize,
  onDownload,
}: {
  kind: ResponseKind;
  contentType: string;
  bodyBytes: number[];
  responseSize: number;
  onDownload: () => void;
}) {
  const blob = new Blob([new Uint8Array(bodyBytes)], { type: contentType });
  const url = URL.createObjectURL(blob);
  const revoke = () => setTimeout(() => URL.revokeObjectURL(url), 1000);
  const label = responseKindLabel(kind, contentType);

  if (kind === "image" || kind === "svg") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          height: "100%",
        }}
      >
        <img
          src={url}
          alt={label}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            borderRadius: "var(--radius)",
          }}
          onLoad={revoke}
        />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          height: "100%",
        }}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: raw API response preview */}
        <audio controls src={url} onLoadedData={revoke} style={{ width: "min(420px, 100%)" }} />
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
          {label} · {(responseSize / 1024).toFixed(1)} KB
        </p>
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 16,
          height: "100%",
        }}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: raw API response preview */}
        <video
          controls
          src={url}
          onLoadedData={revoke}
          style={{ maxWidth: "100%", maxHeight: "70%", borderRadius: "var(--radius)" }}
        />
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
          {label} · {(responseSize / 1024).toFixed(1)} KB
        </p>
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 240 }}>
        <iframe
          title="PDF response"
          src={url}
          sandbox=""
          onLoad={revoke}
          style={{ flex: 1, border: "none", width: "100%", minHeight: 280 }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "48px 24px",
        color: "var(--text-secondary)",
      }}
    >
      <FileCode size={32} />
      <p style={{ fontSize: "var(--text-code)", margin: 0 }}>
        {label} ({contentType || "unknown"})
      </p>
      <p style={{ fontSize: "var(--text-xs)", margin: 0 }}>{(responseSize / 1024).toFixed(1)} KB</p>
      <Button variant="ghost" size="sm" onClick={onDownload} style={{ gap: 6 }}>
        <Download size={13} /> Download File
      </Button>
    </div>
  );
}

const MEDIA_KINDS = new Set<ResponseKind>([
  "image",
  "svg",
  "audio",
  "video",
  "pdf",
  "zip",
  "protobuf",
  "msgpack",
  "binary",
]);

const TEXT_PRETTY_KINDS = new Set<ResponseKind>([
  "json",
  "ndjson",
  "xml",
  "html",
  "csv",
  "yaml",
  "graphql",
  "text",
  "form",
  "other",
]);

type BodyViewMode = "preview" | "pretty" | "raw";

/** Sandboxed HTML preview — Content-Type text/html only. */
function HtmlPreview({ html }: { html: string }) {
  return (
    <iframe
      data-testid="response-html-preview"
      title="HTML preview"
      srcDoc={html}
      sandbox=""
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        minHeight: 280,
        border: "none",
        background: "#fff",
      }}
    />
  );
}

/**
 * Insert `<mark>` wrappers into already syntax-highlighted (hljs) HTML at plain-text
 * match offsets. Walks the HTML tracking a "plain text consumed" counter that skips
 * tags entirely and counts each HTML entity (`&amp;`, `&lt;`, …) as the single
 * character it represents, so offsets computed against the original plain text
 * (via `findMatches`) land in the right place without corrupting existing tags.
 */
function markHighlightedHtml(
  html: string,
  matches: number[],
  queryLen: number,
  current: number,
): string {
  if (matches.length === 0 || queryLen === 0) return html;
  const startAt = new Map<number, number[]>();
  const endAt = new Map<number, number[]>();
  matches.forEach((start, idx) => {
    const end = start + queryLen;
    (startAt.get(start) ?? startAt.set(start, []).get(start))?.push(idx);
    (endAt.get(end) ?? endAt.set(end, []).get(end))?.push(idx);
  });

  const openTag = (idx: number) => {
    const isCurrent = idx === current;
    const bg = isCurrent
      ? "var(--primary)"
      : "color-mix(in oklch, var(--primary) 30%, transparent)";
    const fg = isCurrent ? "var(--primary-foreground)" : "inherit";
    const testId = isCurrent ? ' data-find-current="1" data-testid="response-find-current"' : "";
    return `<mark${testId} style="background:${bg};color:${fg};border-radius:2px">`;
  };

  let out = "";
  let plain = 0;
  let i = 0;
  const n = html.length;
  while (i < n) {
    const ends = endAt.get(plain);
    if (ends) for (let k = 0; k < ends.length; k++) out += "</mark>";
    const starts = startAt.get(plain);
    if (starts) for (let k = 0; k < starts.length; k++) out += openTag(starts[k]);

    const ch = html[i];
    if (ch === "<") {
      const tagEnd = html.indexOf(">", i);
      const safeEnd = tagEnd === -1 ? n - 1 : tagEnd;
      out += html.slice(i, safeEnd + 1);
      i = safeEnd + 1;
      continue;
    }
    if (ch === "&") {
      const entEnd = html.indexOf(";", i);
      if (entEnd !== -1 && entEnd - i <= 9) {
        out += html.slice(i, entEnd + 1);
        i = entEnd + 1;
        plain += 1;
        continue;
      }
    }
    out += ch;
    i += 1;
    plain += 1;
  }
  const endsAtFinal = endAt.get(plain);
  if (endsAtFinal) for (let k = 0; k < endsAtFinal.length; k++) out += "</mark>";
  return out;
}

/** ⌘F find view — same line-numbered, syntax-highlighted layout as CodeBlock, with
 *  match offsets (from the plain text) re-projected onto the highlighted HTML. */
function MarkedCodeBlock({
  code,
  language,
  wrap,
  matches,
  queryLen,
  current,
}: {
  code: string;
  language: string;
  wrap: boolean;
  matches: number[];
  queryLen: number;
  current: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineNums = useMemo(() => code.split("\n").map((_, i) => i + 1), [code]);
  const markedHtml = useMemo(() => {
    const highlighted = hljsHighlight(code, language);
    return markHighlightedHtml(highlighted, matches, queryLen, current);
  }, [code, language, matches, queryLen, current]);

  // Re-center the active match every time it moves (Enter / arrows / retyping the
  // query) — `current` is the real trigger; `markedHtml` just needs to have committed
  // to the DOM first, which it has by the time this effect runs.
  // biome-ignore lint/correctness/useExhaustiveDependencies: current is the intentional trigger
  useEffect(() => {
    containerRef.current
      ?.querySelector('[data-find-current="1"]')
      ?.scrollIntoView({ block: "center" });
  }, [current, markedHtml]);

  return (
    <div
      ref={containerRef}
      data-testid="response-find-text"
      style={{
        display: "flex",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-code)",
        lineHeight: "21px",
        minWidth: wrap ? undefined : "max-content",
        padding: "12px 0 12px 16px",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 46,
          textAlign: "right",
          paddingRight: 18,
          color: "var(--text-placeholder)",
          userSelect: "none",
          fontSize: "var(--text-xs)",
          lineHeight: "21px",
        }}
      >
        {lineNums.map((num) => (
          <div key={num} style={{ height: 21 }}>
            {num}
          </div>
        ))}
      </div>
      <pre
        style={{
          flex: 1,
          margin: 0,
          padding: "0 18px 6px 0",
          overflow: "visible",
          whiteSpace: wrap ? "pre-wrap" : "pre",
          wordBreak: wrap ? "break-word" : "normal",
          background: "transparent",
        }}
      >
        <HighlightedHtml
          html={markedHtml}
          className={language ? `language-${language} hljs` : "hljs"}
          style={{
            fontSize: "var(--text-code)",
            lineHeight: "21px",
            fontFamily: "var(--font-mono)",
            background: "transparent",
          }}
        />
      </pre>
    </div>
  );
}

/* ── Line-numbered code block ── */
function CodeBlock({
  code,
  language,
  wrap = false,
}: {
  code: string;
  language: string;
  wrap?: boolean;
}) {
  const lines = code.split("\n");
  const lineNums = useMemo(() => lines.map((_, i) => i + 1), [lines]);
  const highlighted = useMemo(() => hljsHighlight(code, language), [code, language]);

  return (
    <div
      style={{
        display: "flex",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-code)",
        lineHeight: "21px",
        minWidth: wrap ? undefined : "max-content",
      }}
    >
      {/* Line numbers */}
      <div
        style={{
          flexShrink: 0,
          width: 46,
          textAlign: "right",
          paddingRight: 18,
          color: "var(--text-placeholder)",
          userSelect: "none",
          fontSize: "var(--text-xs)",
          lineHeight: "21px",
        }}
      >
        {lineNums.map((num) => (
          <div key={num} style={{ height: 21 }}>
            {num}
          </div>
        ))}
      </div>
      {/* Code */}
      <pre
        style={{
          flex: 1,
          margin: 0,
          padding: "0 18px 6px 0",
          overflow: "visible",
          whiteSpace: wrap ? "pre-wrap" : "pre",
          wordBreak: wrap ? "break-word" : "normal",
          background: "transparent",
        }}
      >
        <HighlightedHtml
          html={highlighted}
          className={language ? `language-${language} hljs` : "hljs"}
          style={{
            fontSize: "var(--text-code)",
            lineHeight: "21px",
            fontFamily: "var(--font-mono)",
            background: "transparent",
          }}
        />
      </pre>
    </div>
  );
}

/* ── Empty state ── */
function EmptyResponse() {
  const hasUrl = useTabStore((s) => {
    const t = s.tabs.find((tab) => tab.id === s.activeTabId);
    return Boolean(t?.request.url.trim());
  });

  return (
    <div
      data-testid="response-empty"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "48px 24px",
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.4 }}
        aria-hidden="true"
      >
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            margin: "0 0 4px",
          }}
        >
          {hasUrl ? "Ready to send" : "No response yet"}
        </p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: 0 }}>
          {hasUrl
            ? "Run this request to see the response here"
            : "Enter a URL above to get started"}
        </p>
      </div>
      {hasUrl && (
        <button
          type="button"
          onClick={() => {
            (document.querySelector("[data-send-btn]") as HTMLButtonElement | null)?.click();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 28,
            padding: "0 12px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text-secondary)",
            fontFamily: "inherit",
            fontSize: "var(--text-xs)",
            cursor: "pointer",
            transition: "all 0.1s",
          }}
          className="hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          <Send size={12} />
          Send request
          <kbd
            style={{
              marginLeft: 2,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--text-secondary)",
              opacity: 0.7,
            }}
          >
            ⌘↵
          </kbd>
        </button>
      )}
    </div>
  );
}

/* ── Response content (status bar + body/headers) ── */
function ResponseContent({
  response,
  statusColor,
  bodyBytes,
  bodyStr,
  respKind,
  responseSize,
  activeTab,
  setActiveTab,
  bodyView,
  setBodyView,
  wordWrap,
  setWordWrap,
  toast,
  toastTimer,
  setToast,
  downloadBlob,
  codeLanguage,
  request,
  sseActive,
  onStopSse,
}: {
  response: NonNullable<ReturnType<typeof useTabStore.getState>["tabs"][number]["response"]>;
  statusColor: string;
  bodyBytes: number[];
  bodyStr: string;
  respKind: ResponseKind;
  responseSize: number;
  activeTab: "body" | "headers";
  setActiveTab: (tab: "body" | "headers") => void;
  bodyView: BodyViewMode;
  setBodyView: (v: BodyViewMode) => void;
  wordWrap: boolean;
  setWordWrap: (v: boolean) => void;
  toast: boolean;
  toastTimer: ReturnType<typeof useRef<ReturnType<typeof setTimeout> | null>>;
  setToast: (v: boolean) => void;
  downloadBlob: (filename: string) => void;
  codeLanguage: string;
  request?: ReturnType<typeof useTabStore.getState>["tabs"][number]["request"];
  sseActive: boolean;
  onStopSse?: () => void;
}) {
  const isHtml = respKind === "html";
  const viewModes: { val: BodyViewMode; label: string }[] = isHtml
    ? [
        { val: "preview", label: "Preview" },
        { val: "pretty", label: "Pretty" },
        { val: "raw", label: "Raw" },
      ]
    : [
        { val: "pretty", label: "Pretty" },
        { val: "raw", label: "Raw" },
      ];
  const effectiveView: BodyViewMode = bodyView === "preview" && !isHtml ? "pretty" : bodyView;
  const showToast = () => {
    setToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 3000);
  };

  const getFormattedCode = () => {
    if (respKind === "json" || respKind === "ndjson") {
      if (respKind === "ndjson") {
        // Pretty each JSON line independently when possible.
        return bodyStr
          .split("\n")
          .map((line) => {
            const t = line.trim();
            if (!t) return line;
            try {
              return JSON.stringify(JSON.parse(t), null, 2);
            } catch {
              return line;
            }
          })
          .join("\n\n");
      }
      try {
        return JSON.stringify(JSON.parse(bodyStr), null, 2);
      } catch {}
    }
    return bodyStr;
  };

  const isSse =
    response.sse ||
    isEventStreamContentType(response.contentType) ||
    (response.sseEvents?.length ?? 0) > 0 ||
    respKind === "sse";

  const showMedia = !isSse && bodyBytes.length > 0 && MEDIA_KINDS.has(respKind);

  const showText = !(isSse || showMedia) && bodyBytes.length > 0 && TEXT_PRETTY_KINDS.has(respKind);

  // ⌘F find-in-response — searches whatever text is currently displayed (pretty-printed
  // for JSON/NDJSON, as-is for HTML/XML/CSV/YAML/text/etc.) so results keep the same
  // formatting the user is looking at instead of collapsing to the raw single-line body.
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const findSourceText = effectiveView === "raw" ? bodyStr : getFormattedCode();
  const responseMatches = useMemo(
    () => findMatches(findSourceText, findQuery),
    [findSourceText, findQuery],
  );
  const clampedFindIndex = responseMatches.length
    ? Math.min(findIndex, responseMatches.length - 1)
    : 0;
  const findActive = findOpen && findQuery.length > 0 && showText && activeTab === "body";
  const closeFind = () => {
    setFindOpen(false);
    setFindQuery("");
    setFindIndex(0);
  };

  return (
    <>
      <div className="flex h-11 flex-shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}99` }}
          />
          <span
            data-testid="response-status"
            className="font-mono text-code font-semibold"
            style={{ color: statusColor }}
          >
            {response.status} {response.statusText}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground">
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-mono text-code">{response.responseTime} ms</span>
        </div>
        <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 16px" }} />
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}
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
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-code)" }}>
            {responseSize < 1024 ? `${responseSize} B` : `${(responseSize / 1024).toFixed(1)} KB`}
            {response.truncated ? " · truncated" : ""}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <Tab active={activeTab === "body"} onClick={() => setActiveTab("body")}>
          Body
        </Tab>
        <Tab active={activeTab === "headers"} onClick={() => setActiveTab("headers")}>
          Headers
          {Object.keys(response.headers).length > 0 && (
            <span className="ml-0.5 text-2xs font-semibold text-muted-foreground">
              {Object.keys(response.headers).length}
            </span>
          )}
        </Tab>
        <div className="mx-2 h-4 w-px bg-border" />
        {!isSse && showText && (
          <div className="flex rounded border border-border bg-card p-0.5">
            {viewModes.map(({ val, label }) => (
              <button
                type="button"
                key={label}
                data-testid={`response-view-${val}`}
                onClick={() => setBodyView(val)}
                className={`h-6 cursor-pointer rounded px-3 text-xs transition-all ${
                  effectiveView === val
                    ? "bg-accent font-semibold text-foreground"
                    : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {!isSse && showText && effectiveView !== "preview" && (
          <Button
            variant="ghost"
            size="icon"
            data-testid="response-wrap-toggle"
            onClick={() => setWordWrap(!wordWrap)}
            aria-pressed={wordWrap}
            title={wordWrap ? "Word wrap: on" : "Word wrap: off"}
            className={wordWrap ? "text-primary" : undefined}
          >
            <WrapText className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            navigator.clipboard.writeText(request ? generateCurl(request) : "");
            showToast();
          }}
          title="Copy as cURL"
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
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => downloadBlob(`response-${Date.now()}`)}
          title="Download response"
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
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </Button>
      </div>

      <div className="relative flex-1 min-h-0" data-find-scope="response">
        {findOpen && (
          <div className="absolute right-4 top-2 z-[var(--z-dropdown)]">
            <FindBar
              testId="response-find"
              query={findQuery}
              onQueryChange={(q) => {
                setFindQuery(q);
                setFindIndex(0);
              }}
              matchCount={responseMatches.length}
              index={clampedFindIndex}
              onNext={() =>
                responseMatches.length &&
                setFindIndex((clampedFindIndex + 1) % responseMatches.length)
              }
              onPrev={() =>
                responseMatches.length &&
                setFindIndex(
                  (clampedFindIndex - 1 + responseMatches.length) % responseMatches.length,
                )
              }
              onClose={closeFind}
            />
          </div>
        )}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: scroll container captures Cmd/Ctrl+A (select-all) and Cmd/Ctrl+F (find) scoped to the response body */}
        <div
          className="h-full overflow-auto bg-background"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.code === "KeyF") {
              e.preventDefault();
              e.stopPropagation();
              setFindOpen(true);
              return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "a") {
              e.preventDefault();
              const sel = window.getSelection();
              const pre = e.currentTarget.querySelector("pre");
              const target = pre ?? e.currentTarget;
              if (sel) {
                const range = document.createRange();
                range.selectNodeContents(target);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }}
          tabIndex={-1}
        >
          {activeTab === "headers" && (
            <div style={{ padding: "8px 18px" }}>
              {Object.entries(response.headers).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 14,
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                  className="hover:bg-[var(--bg-elevated)]"
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 200,
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--method-get)",
                    }}
                  >
                    {key}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--text-primary)",
                      wordBreak: "break-all",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "body" && (
            <>
              {isSse && (
                <SseEventList
                  events={response.sseEvents ?? []}
                  active={sseActive}
                  onStop={onStopSse}
                  wordWrap={wordWrap}
                />
              )}

              {!isSse && showMedia && (
                <MediaPane
                  kind={MEDIA_KINDS.has(respKind) ? respKind : "binary"}
                  contentType={response.contentType}
                  bodyBytes={bodyBytes}
                  responseSize={responseSize}
                  onDownload={() => downloadBlob(`response-${Date.now()}`)}
                />
              )}

              {findActive && (
                <MarkedCodeBlock
                  code={findSourceText}
                  language={codeLanguage}
                  wrap={wordWrap}
                  matches={responseMatches}
                  queryLen={findQuery.length}
                  current={clampedFindIndex}
                />
              )}

              {!(findActive || isSse) && showText && effectiveView === "preview" && isHtml && (
                <div data-testid="response-body" style={{ height: "100%", minHeight: 280 }}>
                  <HtmlPreview html={bodyStr} />
                </div>
              )}

              {!(findActive || isSse) && showText && effectiveView !== "preview" && (
                <div data-testid="response-body" style={{ padding: "12px 0 12px 16px" }}>
                  {effectiveView === "pretty" ? (
                    <CodeBlock code={getFormattedCode()} language={codeLanguage} wrap={wordWrap} />
                  ) : (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-xs)",
                        lineHeight: 1.7,
                        color: "var(--text-secondary)",
                        whiteSpace: wordWrap ? "pre-wrap" : "pre",
                        wordBreak: wordWrap ? "break-all" : "normal",
                        padding: "0 18px",
                      }}
                    >
                      {bodyStr}
                    </div>
                  )}
                </div>
              )}

              {!isSse && bodyBytes.length === 0 && (
                <StatusEmptyBody status={response.status} statusText={response.statusText} />
              )}
            </>
          )}
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 22,
            right: 22,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--status-2xx)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-toast)",
            zIndex: "var(--z-toast)",
            animation: "pgToast 150ms ease-out",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "rgba(74,222,128,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--status-2xx)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span
            style={{ fontSize: "var(--text-code)", color: "var(--text-primary)", fontWeight: 500 }}
          >
            Copied cURL to clipboard
          </span>
          <button
            type="button"
            onClick={() => setToast(false)}
            aria-label="Dismiss"
            style={{
              marginLeft: 8,
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              background: "none",
              border: "none",
              padding: 0,
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

/* ── Main ResponsePanel ── */
export function ResponsePanel({
  tabId,
  onResizeStart,
}: {
  tabId: string;
  onResizeStart?: (e: React.MouseEvent) => void;
}) {
  const tabs = useTabStore((s) => s.tabs);
  const tab = tabs.find((t) => t.id === tabId);
  const response = tab?.response ?? null;
  const isLoading = tab?.isLoading ?? false;
  const request = tab?.request;

  const [activeTab, setActiveTab] = useState<"body" | "headers">("body");
  const [bodyView, setBodyView] = useState<BodyViewMode>("pretty");
  const { wordWrap, setWordWrap } = useWordWrap();
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bodyBytes = response?.body ?? [];
  const bodyStr = useMemo(() => formatBody(bodyBytes), [bodyBytes]);
  const respKind = response ? classifyResponse(response.contentType) : "other";
  const responseSize = bodyBytes.length;

  // text/html → Preview by default when a new HTML response arrives.
  useEffect(() => {
    if (!response) return;
    setBodyView(classifyResponse(response.contentType) === "html" ? "preview" : "pretty");
  }, [response]);

  // Any response object counts — including status 0 errors and empty bodies.
  const hasResponse = response != null;
  const sseLive =
    isLoading &&
    Boolean(
      response?.sse ||
        isEventStreamContentType(response?.contentType) ||
        (response?.sseEvents?.length ?? 0) > 0 ||
        respKind === "sse",
    );

  const stopSse = () => {
    const sid = getTabStreamId(tabId);
    cancelTabStream(tabId);
    if (sid) void cancelSseStream(sid);
  };

  const downloadBlob = (filename: string) => {
    const blob = new Blob([new Uint8Array(bodyBytes)], { type: response?.contentType ?? "" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const codeLanguage = highlightLanguageFor(response?.contentType ?? "");

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ overflow: "hidden" }}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer-driven resize handle */}
      <div
        className="group flex h-1 flex-shrink-0 cursor-row-resize items-center justify-center border-t border-border bg-transparent transition-colors hover:bg-accent/40 active:bg-accent/60 select-none"
        onMouseDown={onResizeStart}
      >
        <div className="h-0.5 w-8 rounded-full bg-border opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      {isLoading && !sseLive ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                border: "2px solid rgba(124,110,250,0.3)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
          </div>
          <div style={{ flex: 1 }} />
        </div>
      ) : !hasResponse ? (
        <EmptyResponse />
      ) : (
        <ResponseContent
          response={response}
          statusColor={getStatusColor(response.status)}
          bodyBytes={bodyBytes}
          bodyStr={bodyStr}
          respKind={respKind}
          responseSize={responseSize}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          bodyView={bodyView}
          setBodyView={setBodyView}
          wordWrap={wordWrap}
          setWordWrap={setWordWrap}
          toast={toast}
          toastTimer={toastTimer}
          setToast={setToast}
          downloadBlob={downloadBlob}
          codeLanguage={codeLanguage}
          request={request}
          sseActive={sseLive}
          onStopSse={stopSse}
        />
      )}
    </div>
  );
}
