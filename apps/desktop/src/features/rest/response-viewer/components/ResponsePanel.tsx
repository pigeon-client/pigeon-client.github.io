import { CircleStop } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  cancelSseStream,
  cancelTabStream,
  getTabStreamId,
  isEventStreamContentType,
} from "@/core/http";
import { generateCurl } from "@/features/rest/import-export";
import { useTabStore } from "@/features/rest/request-builder";
import { useWordWrap } from "@/features/settings";
import {
  classifyResponse,
  highlightLanguageFor,
  type ResponseKind,
} from "@/shared/lib/contentType";
import { findMatches } from "@/shared/lib/textFind";
import { FindBar } from "@/shared/ui/FindBar";
import { BodyView, MEDIA_KINDS, TEXT_PRETTY_KINDS } from "./BodyView";
import { EmptyResponse } from "./EmptyResponse";
import { HeadersTable } from "./HeadersTable";
import { StatusLine } from "./StatusLine";
import type { BodyViewMode } from "./types";

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
      <StatusLine
        response={response}
        statusColor={statusColor}
        responseSize={responseSize}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSse={isSse}
        showText={showText}
        viewModes={viewModes}
        effectiveView={effectiveView}
        setBodyView={setBodyView}
        wordWrap={wordWrap}
        setWordWrap={setWordWrap}
        onCopyCurl={() => {
          navigator.clipboard.writeText(request ? generateCurl(request) : "");
          showToast();
        }}
        onDownload={() => downloadBlob(`response-${Date.now()}`)}
      />

      <div className="relative flex-1 min-h-0" data-find-scope="response">
        {findOpen && (
          <div className="absolute right-4 top-2 z-dropdown">
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
          {activeTab === "headers" && <HeadersTable headers={response.headers} />}

          {activeTab === "body" && (
            <BodyView
              isSse={isSse}
              response={response}
              sseActive={sseActive}
              onStopSse={onStopSse}
              wordWrap={wordWrap}
              showMedia={showMedia}
              respKind={respKind}
              bodyBytes={bodyBytes}
              responseSize={responseSize}
              onDownload={() => downloadBlob(`response-${Date.now()}`)}
              findActive={findActive}
              findSourceText={findSourceText}
              codeLanguage={codeLanguage}
              responseMatches={responseMatches}
              findQueryLen={findQuery.length}
              clampedFindIndex={clampedFindIndex}
              showText={showText}
              effectiveView={effectiveView}
              isHtml={isHtml}
              bodyStr={bodyStr}
              getFormattedCode={getFormattedCode}
            />
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
export function ResponsePanel({ tabId }: { tabId: string }) {
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

  // Aborts the in-flight request — SSE stream or a plain buffered response alike.
  const cancelRequest = () => {
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {isLoading && !sseLive ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
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
            <button
              type="button"
              data-testid="response-cancel"
              onClick={cancelRequest}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 24,
                padding: "0 8px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontFamily: "inherit",
                fontSize: "var(--text-xs)",
                cursor: "pointer",
              }}
              className="hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            >
              <CircleStop size={12} />
              Cancel
            </button>
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
          onStopSse={cancelRequest}
        />
      )}
    </div>
  );
}
