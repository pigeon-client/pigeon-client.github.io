import { Button } from "@pigeon/ui";
import { Download, FileCode } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { SseEvent } from "@/core/http";
import type { ResponseKind } from "@/shared/lib/contentType";
import { responseKindLabel } from "@/shared/lib/contentType";
import { HighlightedHtml } from "@/shared/ui/HighlightedHtml";
import { highlightCode } from "@/shared/ui/result-viewer";
import { SseEventList } from "./SseEventList";
import { StatusEmptyBody } from "./StatusEmptyBody";
import type { BodyViewMode } from "./types";

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

export const MEDIA_KINDS = new Set<ResponseKind>([
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

export const TEXT_PRETTY_KINDS = new Set<ResponseKind>([
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
    const highlighted = highlightCode(code, language);
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
  const highlighted = useMemo(() => highlightCode(code, language), [code, language]);

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

/* ── Body pane (SSE / media / find / preview / pretty / raw / empty) ── */
export function BodyView({
  isSse,
  response,
  sseActive,
  onStopSse,
  wordWrap,
  showMedia,
  respKind,
  bodyBytes,
  responseSize,
  onDownload,
  findActive,
  findSourceText,
  codeLanguage,
  responseMatches,
  findQueryLen,
  clampedFindIndex,
  showText,
  effectiveView,
  isHtml,
  bodyStr,
  getFormattedCode,
}: {
  isSse: boolean;
  response: { sseEvents?: SseEvent[]; contentType: string; status: number; statusText: string };
  sseActive: boolean;
  onStopSse?: () => void;
  wordWrap: boolean;
  showMedia: boolean;
  respKind: ResponseKind;
  bodyBytes: number[];
  responseSize: number;
  onDownload: () => void;
  findActive: boolean;
  findSourceText: string;
  codeLanguage: string;
  responseMatches: number[];
  findQueryLen: number;
  clampedFindIndex: number;
  showText: boolean;
  effectiveView: BodyViewMode;
  isHtml: boolean;
  bodyStr: string;
  getFormattedCode: () => string;
}) {
  return (
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
          onDownload={onDownload}
        />
      )}

      {findActive && (
        <MarkedCodeBlock
          code={findSourceText}
          language={codeLanguage}
          wrap={wordWrap}
          matches={responseMatches}
          queryLen={findQueryLen}
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
  );
}
