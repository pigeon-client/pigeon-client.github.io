import { Button } from "@pigeon/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, FileCode } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SseEvent } from "@/core/http";
import type { ResponseKind } from "@/shared/lib/contentType";
import { responseKindLabel } from "@/shared/lib/contentType";
import { HighlightedHtml } from "@/shared/ui/HighlightedHtml";
import { highlightCode } from "@/shared/ui/result-viewer";
import { collapsedLineText, findJsonFoldRegions, foldRegionsByStart } from "../lib/jsonFoldRegions";
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
  bodyBytes: Uint8Array;
  responseSize: number;
  onDownload: () => void;
}) {
  const blob = new Blob([bodyBytes], { type: contentType });
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
const VIRTUALIZE_AFTER = 400;
const SKIP_HIGHLIGHT_CHARS = 200_000;
const SKIP_HIGHLIGHT_LINES = 2_000;
const CODE_LINE_H = 21;

type VisibleCodeRow = {
  i: number;
  text: string;
  html: string;
  foldable: boolean;
};

function VirtualizedCodeRows({
  rows,
  wrap,
  highlight,
  language,
  collapsed,
  foldByStart,
  onToggleFold,
}: {
  rows: VisibleCodeRow[];
  wrap: boolean;
  highlight: boolean;
  language: string;
  collapsed: ReadonlySet<number>;
  foldByStart: ReturnType<typeof foldRegionsByStart>;
  onToggleFold: (startLine: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const list = listRef.current;
    const parent =
      (list?.closest(".overflow-auto") as HTMLElement | null) ?? list?.parentElement ?? null;
    setScrollEl(parent);
    if (list && parent) {
      setScrollMargin(
        list.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop,
      );
    }
  }, [rows.length]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => CODE_LINE_H,
    overscan: 24,
    scrollMargin,
    enabled: scrollEl != null && rows.length > 0,
  });

  const codeLineStyle = {
    flex: 1,
    minWidth: 0,
    margin: 0,
    padding: "0 18px 0 0",
    whiteSpace: wrap ? ("pre-wrap" as const) : ("pre" as const),
    wordBreak: wrap ? ("break-word" as const) : ("normal" as const),
    lineHeight: `${CODE_LINE_H}px`,
    background: "transparent",
  };

  return (
    <div
      ref={listRef}
      style={{
        height: virtualizer.getTotalSize(),
        width: "100%",
        position: "relative",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-code)",
        lineHeight: `${CODE_LINE_H}px`,
      }}
    >
      {virtualizer.getVirtualItems().map((vItem) => {
        const row = rows[vItem.index];
        if (!row) return null;
        const region = row.foldable ? foldByStart.get(row.i) : undefined;
        return (
          <div
            key={vItem.key}
            data-index={vItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vItem.start - scrollMargin}px)`,
              display: "flex",
              alignItems: "flex-start",
              minHeight: CODE_LINE_H,
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 46,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-end",
                gap: 2,
                paddingRight: 6,
                color: "var(--text-placeholder)",
                userSelect: "none",
                fontSize: "var(--text-xs)",
                lineHeight: `${CODE_LINE_H}px`,
              }}
            >
              {region ? (
                <button
                  type="button"
                  aria-label={collapsed.has(row.i) ? "Expand block" : "Collapse block"}
                  aria-expanded={!collapsed.has(row.i)}
                  data-testid="response-fold-toggle"
                  onClick={() => onToggleFold(row.i)}
                  className="flex h-[21px] w-4 shrink-0 cursor-pointer items-center justify-center rounded bg-transparent p-0 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {collapsed.has(row.i) ? "▸" : "▾"}
                </button>
              ) : row.foldable ? (
                <span className="inline-block h-[21px] w-4 shrink-0" aria-hidden />
              ) : null}
              <span className="h-[21px] leading-[21px]">{row.i + 1}</span>
            </div>
            <div style={codeLineStyle}>
              {highlight ? (
                <HighlightedHtml
                  html={row.html}
                  className={language ? `language-${language} hljs` : "hljs"}
                  style={{
                    fontSize: "var(--text-code)",
                    lineHeight: `${CODE_LINE_H}px`,
                    fontFamily: "var(--font-mono)",
                    background: "transparent",
                  }}
                />
              ) : (
                <code style={{ color: "var(--foreground)" }}>{row.text}</code>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CodeBlock({
  code,
  language,
  wrap = false,
  highlight = true,
  foldable = false,
}: {
  code: string;
  language: string;
  wrap?: boolean;
  highlight?: boolean;
  foldable?: boolean;
}) {
  const lines = useMemo(() => code.split("\n"), [code]);
  const skipHighlight = code.length > SKIP_HIGHLIGHT_CHARS || lines.length > SKIP_HIGHLIGHT_LINES;
  const doHighlight = highlight && !skipHighlight;
  const foldRegions = useMemo(() => (foldable ? findJsonFoldRegions(code) : []), [code, foldable]);
  const foldByStart = useMemo(() => foldRegionsByStart(foldRegions), [foldRegions]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set());
  const highlighted = useMemo(
    () => (doHighlight && !foldable ? highlightCode(code, language) : ""),
    [code, language, doHighlight, foldable],
  );
  const lineHtml = useMemo(() => {
    if (!(doHighlight && foldable)) return [];
    return lines.map((line) => (line ? highlightCode(line, language) : ""));
  }, [lines, doHighlight, foldable, language]);

  const toggleFold = (startLine: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(startLine)) next.delete(startLine);
      else next.add(startLine);
      return next;
    });
  };

  const lineNums = useMemo(() => lines.map((_, i) => i + 1), [lines]);
  const useFoldLayout = foldable && foldRegions.length > 0;
  const needsVirtual = lines.length > VIRTUALIZE_AFTER;
  const visibleRows = useMemo((): VisibleCodeRow[] | null => {
    if (!needsVirtual) return null;
    const escapeHtml = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (!useFoldLayout) {
      return lines.map((line, i) => ({
        i,
        text: line,
        html: doHighlight ? (line ? highlightCode(line, language) : "") : "",
        foldable: false,
      }));
    }
    const rows: VisibleCodeRow[] = [];
    for (let i = 0; i < lines.length; i++) {
      let hidden = false;
      for (const start of collapsed) {
        const folded = foldByStart.get(start);
        if (folded && i > folded.startLine && i <= folded.endLine) {
          hidden = true;
          break;
        }
      }
      if (hidden) continue;
      const region = foldByStart.get(i);
      const collapsedRegion = collapsed.has(i) ? region : undefined;
      const text = collapsedRegion ? collapsedLineText(lines[i], collapsedRegion, lines) : lines[i];
      rows.push({
        i,
        text,
        html: collapsedRegion ? escapeHtml(text) : (lineHtml[i] ?? escapeHtml(text)),
        foldable: true,
      });
    }
    return rows;
  }, [needsVirtual, lines, useFoldLayout, collapsed, foldByStart, doHighlight, language, lineHtml]);

  const codeLineStyle = {
    flex: 1,
    minWidth: 0,
    margin: 0,
    padding: "0 18px 0 0",
    whiteSpace: wrap ? ("pre-wrap" as const) : ("pre" as const),
    wordBreak: wrap ? ("break-word" as const) : ("normal" as const),
    lineHeight: "21px",
    background: "transparent",
  };

  if (visibleRows) {
    return (
      <VirtualizedCodeRows
        rows={visibleRows}
        wrap={wrap}
        highlight={doHighlight}
        language={language}
        collapsed={collapsed}
        foldByStart={foldByStart}
        onToggleFold={toggleFold}
      />
    );
  }

  if (useFoldLayout) {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-code)",
          lineHeight: "21px",
          minWidth: wrap ? undefined : "max-content",
          paddingBottom: 6,
        }}
      >
        {lines.map((line, i) => {
          let hidden = false;
          for (const start of collapsed) {
            const folded = foldByStart.get(start);
            if (folded && i > folded.startLine && i <= folded.endLine) {
              hidden = true;
              break;
            }
          }
          if (hidden) return null;
          const region = foldByStart.get(i);
          const collapsedRegion = collapsed.has(i) ? region : undefined;
          const text = collapsedRegion ? collapsedLineText(line, collapsedRegion, lines) : line;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: positional code lines
              key={`row-${i}`}
              style={{ display: "flex", alignItems: "flex-start", minHeight: 21 }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 46,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                  gap: 2,
                  paddingRight: 6,
                  color: "var(--text-placeholder)",
                  userSelect: "none",
                  fontSize: "var(--text-xs)",
                  lineHeight: "21px",
                }}
              >
                {region ? (
                  <button
                    type="button"
                    aria-label={collapsed.has(i) ? "Expand block" : "Collapse block"}
                    aria-expanded={!collapsed.has(i)}
                    data-testid="response-fold-toggle"
                    onClick={() => toggleFold(i)}
                    className="flex h-[21px] w-4 shrink-0 cursor-pointer items-center justify-center rounded bg-transparent p-0 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {collapsed.has(i) ? "▸" : "▾"}
                  </button>
                ) : (
                  <span className="inline-block h-[21px] w-4 shrink-0" aria-hidden />
                )}
                <span className="h-[21px] leading-[21px]">{i + 1}</span>
              </div>
              <div style={codeLineStyle}>
                {doHighlight ? (
                  <HighlightedHtml
                    html={
                      collapsedRegion
                        ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                        : lineHtml[i]
                    }
                    className={language ? `language-${language} hljs` : "hljs"}
                    style={{
                      fontSize: "var(--text-code)",
                      lineHeight: "21px",
                      fontFamily: "var(--font-mono)",
                      background: "transparent",
                    }}
                  />
                ) : (
                  <code style={{ color: "var(--foreground)" }}>{text}</code>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

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
        {doHighlight ? (
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
        ) : (
          <code style={{ color: "var(--foreground)" }}>{code}</code>
        )}
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
  formattedCode,
}: {
  isSse: boolean;
  response: { sseEvents?: SseEvent[]; contentType: string; status: number; statusText: string };
  sseActive: boolean;
  onStopSse?: () => void;
  wordWrap: boolean;
  showMedia: boolean;
  respKind: ResponseKind;
  bodyBytes: Uint8Array;
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
  formattedCode: string;
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
          <CodeBlock
            code={effectiveView === "raw" ? bodyStr : formattedCode}
            language={codeLanguage}
            wrap={wordWrap}
            highlight={effectiveView === "pretty"}
            foldable={respKind === "json"}
          />
        </div>
      )}

      {!isSse && bodyBytes.length === 0 && (
        <StatusEmptyBody status={response.status} statusText={response.statusText} />
      )}
    </>
  );
}
