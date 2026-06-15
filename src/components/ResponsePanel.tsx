import hljs from "highlight.js";
import { Download, FileCode, Terminal } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { generateCurl } from "../lib/curl";
import { useTabStore } from "../store/tabStore";
import { Button } from "./ui/Button";
import { HighlightedHtml } from "./ui/HighlightedHtml";
import { Tab } from "./ui/Tab";

function formatBody(body: number[]): string {
  return new TextDecoder().decode(new Uint8Array(body));
}

type ResponseType =
  | "json"
  | "html"
  | "xml"
  | "image"
  | "audio"
  | "video"
  | "octet"
  | "text"
  | "form"
  | "other";

function detectType(contentType: string): ResponseType {
  const ct = contentType.toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("html")) return "html";
  if (ct.includes("xml")) return "xml";
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("audio/")) return "audio";
  if (ct.startsWith("video/")) return "video";
  if (ct.includes("octet-stream")) return "octet";
  if (ct.includes("text/")) return "text";
  if (ct.includes("form")) return "form";
  return "other";
}

function isBinaryBody(body: number[]): boolean {
  const sample = body.slice(0, 4096);
  for (const byte of sample) {
    if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) return true;
  }
  return false;
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "#4ADE80";
  if (status >= 300 && status < 400) return "#60A5FA";
  if (status >= 400 && status < 500) return "#FB923C";
  if (status >= 500) return "#F87171";
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

/* ── Line-numbered code block ── */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const lines = code.split("\n");
  const lineNums = useMemo(() => lines.map((_, i) => i + 1), [lines]);
  const highlighted = useMemo(() => hljsHighlight(code, language), [code, language]);

  return (
    <div
      style={{ display: "flex", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: "21px" }}
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
          fontSize: 12.5,
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
          background: "transparent",
        }}
      >
        <HighlightedHtml
          html={highlighted}
          className={language ? `language-${language} hljs` : "hljs"}
          style={{
            fontSize: 13,
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
  return (
    <div
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
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-secondary)",
            margin: "0 0 4px",
          }}
        >
          Ready to send a request
        </p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
          Enter a URL above and click Send
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          const tabStore = useTabStore.getState();
          const tid = tabStore.activeTabId;
          if (tid)
            tabStore.updateTabRequest(tid, {
              method: "GET",
              url: "https://jsonplaceholder.typicode.com/posts/1",
            });
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 28,
          padding: "0 12px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: "var(--text-secondary)",
          fontFamily: "inherit",
          fontSize: 12,
          cursor: "pointer",
          transition: "all 0.1s",
        }}
        className="hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
      >
        <Terminal size={12} />
        Try an example request
      </button>
    </div>
  );
}

export function ResponsePanel({ tabId }: { tabId: string }) {
  const tabs = useTabStore((s) => s.tabs);
  const tab = tabs.find((t) => t.id === tabId);
  const response = tab?.response ?? null;
  const isLoading = tab?.isLoading ?? false;
  const request = tab?.request;

  const [activeTab, setActiveTab] = useState<"body" | "headers">("body");
  const [pretty, setPretty] = useState(true);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bodyBytes = response?.body ?? [];
  const bodyStr = useMemo(() => formatBody(bodyBytes), [bodyBytes]);
  const respType = response ? detectType(response.contentType) : "text";
  const isBinary = bodyBytes.length > 0 && isBinaryBody(bodyBytes);
  const isImage = respType === "image";
  const responseSize = bodyBytes.length;

  const showToast = () => {
    setToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 3000);
  };

  const getFormattedCode = () => {
    if (respType === "json") {
      try {
        return JSON.stringify(JSON.parse(bodyStr), null, 2);
      } catch {}
    }
    return bodyStr;
  };

  const codeLanguage =
    respType === "json" ? "json" : respType === "html" ? "html" : respType === "xml" ? "xml" : "";

  const downloadBlob = (filename: string) => {
    const blob = new Blob([new Uint8Array(bodyBytes)], { type: response?.contentType ?? "" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
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
    );
  }

  /* ── Empty ── */
  if (!response || (response.status === 0 && bodyBytes.length === 0)) {
    return <EmptyResponse />;
  }

  const statusColor = getStatusColor(response.status);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Status bar */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          height: 46,
          padding: "0 18px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: statusColor,
              boxShadow: `0 0 8px ${statusColor}99`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13.5,
              fontWeight: 600,
              color: statusColor,
            }}
          >
            {response.status} {response.statusText}
          </span>
        </div>
        <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 16px" }} />
        <div
          style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text-secondary)" }}
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {response.responseTime} ms
          </span>
        </div>
        <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 16px" }} />
        <div
          style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text-secondary)" }}
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
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {responseSize < 1024 ? `${responseSize} B` : `${(responseSize / 1024).toFixed(1)} KB`}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {/* Pretty / Raw toggle — neutral, NOT accent */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: 2,
          }}
        >
          {[
            { val: true, label: "Pretty" },
            { val: false, label: "Raw" },
          ].map(({ val, label }) => (
            <button
              type="button"
              key={label}
              onClick={() => setPretty(val)}
              style={{
                height: 24,
                padding: "0 13px",
                background: pretty === val ? "var(--border)" : "transparent",
                border: "none",
                borderRadius: 5,
                color: pretty === val ? "var(--text-primary)" : "var(--text-secondary)",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: pretty === val ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Response tabs + actions */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "0 18px",
          height: 38,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Tab active={activeTab === "body"} onClick={() => setActiveTab("body")}>
          Body
        </Tab>
        <Tab active={activeTab === "headers"} onClick={() => setActiveTab("headers")}>
          Headers
          {Object.keys(response.headers).length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginLeft: 1,
              }}
            >
              {Object.keys(response.headers).length}
            </span>
          )}
        </Tab>
        <div style={{ flex: 1 }} />
        {/* Action buttons */}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            navigator.clipboard.writeText(request ? generateCurl(request) : "");
            showToast();
          }}
          style={{ gap: 6 }}
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
          Copy
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => downloadBlob(`response-${Date.now()}`)}
          style={{ gap: 6 }}
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
          Download
        </Button>
      </div>

      {/* Body / Headers content */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-base)", minHeight: 0 }}>
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
                    fontSize: 12.5,
                    color: "#4A9EFA",
                  }}
                >
                  {key}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12.5,
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
            {isImage &&
              bodyBytes.length > 0 &&
              (() => {
                const blob = new Blob([new Uint8Array(bodyBytes)], { type: response.contentType });
                const url = URL.createObjectURL(blob);
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
                      alt="Response"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        borderRadius: 6,
                      }}
                      onLoad={() => setTimeout(() => URL.revokeObjectURL(url), 1000)}
                    />
                  </div>
                );
              })()}

            {(isBinary || respType === "octet") && !isImage && (
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
                <p style={{ fontSize: 13, margin: 0 }}>Binary Response ({response.contentType})</p>
                <p style={{ fontSize: 12, margin: 0 }}>{(responseSize / 1024).toFixed(1)} KB</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadBlob(`response-${Date.now()}`)}
                  style={{ gap: 6 }}
                >
                  <Download size={13} /> Download File
                </Button>
              </div>
            )}

            {!(isImage || isBinary) && bodyBytes.length > 0 && (
              <div style={{ padding: "12px 0" }}>
                {pretty ? (
                  <CodeBlock code={getFormattedCode()} language={codeLanguage} />
                ) : (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      color: "var(--text-secondary)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      padding: "0 18px",
                    }}
                  >
                    {bodyStr.replace(/\s+/g, " ").trim()}
                  </div>
                )}
              </div>
            )}

            {bodyBytes.length === 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "48px 24px",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                }}
              >
                Empty response body
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 22,
            right: 22,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "12px 16px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid #4ADE80",
            borderRadius: 9,
            boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
            zIndex: 80,
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
              stroke="#4ADE80"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
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
    </div>
  );
}
