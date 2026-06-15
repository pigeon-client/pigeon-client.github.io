import { ChevronDown, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApiRequest } from "../hooks/useApiRequest";
import { parseCurl } from "../lib/curlParser";
import { replaceEnvVariables } from "../lib/env";
import { extractEndpoint, parseUrl } from "../lib/url";
import { useEnvStore } from "../store/envStore";
import { useTabStore } from "../store/tabStore";
import type { HttpMethod } from "../types";
import { METHOD_COLORS } from "./ui/Badge";
import { Button } from "./ui/Button";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export function UrlBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const setTabLoading = useTabStore((s) => s.setTabLoading);
  const updateTabResponse = useTabStore((s) => s.updateTabResponse);
  const setTabName = useTabStore((s) => s.setTabName);
  const activeEnv = useEnvStore((s) => s.activeEnv);
  const { sendRequest } = useApiRequest();

  const [methodOpen, setMethodOpen] = useState(false);
  const [curlToast, setCurlToast] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!methodOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMethodOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [methodOpen]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  if (!activeTab) return null;

  const { request } = activeTab;
  const methodColor = METHOD_COLORS[request.method] ?? "#94A3B8";

  const handleSend = async () => {
    if (!request.url) return;
    setTabLoading(activeTab.id, true);
    try {
      const result = await sendRequest(request);
      updateTabResponse(activeTab.id, result);
    } catch {
      updateTabResponse(activeTab.id, {
        status: 0,
        statusText: "Request Failed",
        headers: {},
        body: [],
        contentType: "text/plain",
        responseTime: 0,
        size: 0,
        resolvedUrl: request.url ?? "",
        sentHeaders: {},
      });
    } finally {
      setTabLoading(activeTab.id, false);
    }
  };

  const previewUrl = (() => {
    const parsed = parseUrl(request.url);
    return activeEnv ? replaceEnvVariables(parsed, activeEnv) : parsed;
  })();

  /* ── Syntax-tinted URL display ── */
  const renderUrlSegments = (url: string) => {
    if (!url) {
      return (
        <span style={{ color: "var(--text-placeholder)", fontFamily: "var(--font-mono)" }}>
          https://api.example.com/endpoint
        </span>
      );
    }
    const schemeMatch = url.match(/^(https?:\/\/)/i);
    const scheme = schemeMatch ? schemeMatch[1] : "";
    const rest = url.slice(scheme.length);
    const qIdx = rest.indexOf("?");
    const beforeQ = qIdx === -1 ? rest : rest.slice(0, qIdx);
    const query = qIdx === -1 ? "" : rest.slice(qIdx);
    const slashIdx = beforeQ.indexOf("/");
    const host = slashIdx === -1 ? beforeQ : beforeQ.slice(0, slashIdx);
    const path = slashIdx === -1 ? "" : beforeQ.slice(slashIdx);
    return (
      <>
        <span style={{ color: "var(--text-secondary)" }}>{scheme}</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{host}</span>
        <span style={{ color: "var(--accent)", fontWeight: 500 }}>{path}</span>
        <span style={{ color: "var(--text-secondary)" }}>{query}</span>
      </>
    );
  };

  return (
    <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center gap-[10px]">
        {/* Method selector */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setMethodOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              width: 104,
              height: 40,
              padding: "0 13px",
              background: "var(--bg-input)",
              border: `1px solid ${methodOpen ? "var(--border-focus)" : "var(--border)"}`,
              borderRadius: 8,
              color: methodColor,
              fontFamily: "var(--font-mono)",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              transition: "border-color 0.1s",
            }}
          >
            <span>{request.method}</span>
            <ChevronDown size={14} style={{ color: "var(--text-secondary)" }} />
          </button>

          {methodOpen && (
            <div
              style={{
                position: "absolute",
                top: 44,
                left: 0,
                width: 150,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 5,
                boxShadow: "0 14px 36px rgba(0,0,0,0.55)",
                zIndex: 40,
              }}
            >
              {METHODS.map((m) => {
                const mc = METHOD_COLORS[m] ?? "#94A3B8";
                return (
                  <div
                    key={m}
                    role="option"
                    aria-selected={m === request.method}
                    tabIndex={0}
                    onClick={() => {
                      updateTabRequest(activeTab.id, { method: m });
                      setMethodOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        updateTabRequest(activeTab.id, { method: m });
                        setMethodOpen(false);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      height: 30,
                      padding: "0 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: m === request.method ? "var(--border)" : "transparent",
                    }}
                    className="hover:bg-[var(--border)]"
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: mc,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: mc,
                      }}
                    >
                      {m}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* URL input */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            height: 40,
            padding: "0 14px",
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Invisible real input on top */}
          <input
            type="text"
            value={request.url}
            onChange={(e) => {
              const raw = e.target.value;

              if (raw.trimStart().toLowerCase().startsWith("curl ")) {
                const parsed = parseCurl(raw);
                if (parsed?.url) {
                  updateTabRequest(activeTab.id, parsed);
                  if (!activeTab.nameLocked && parsed.url) {
                    setTabName(activeTab.id, extractEndpoint(parsed.url));
                  }
                  if (toastTimer.current) clearTimeout(toastTimer.current);
                  setCurlToast(true);
                  toastTimer.current = setTimeout(() => setCurlToast(false), 2500);
                  return;
                }
              }

              updateTabRequest(activeTab.id, { url: raw });
              if (!activeTab.nameLocked && raw) {
                setTabName(activeTab.id, extractEndpoint(raw));
              }
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="https://api.example.com/endpoint"
            style={{
              position: "absolute",
              inset: 0,
              padding: "0 14px",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "transparent",
              caretColor: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: 13.5,
              zIndex: 2,
            }}
          />
          {/* Syntax-tinted display layer */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 1,
            }}
          >
            {renderUrlSegments(request.url)}
          </div>
        </div>

        {/* Send — the ONLY primary accent button */}
        <Button
          variant="primary"
          size="md"
          onClick={handleSend}
          disabled={!request.url || activeTab.isLoading}
          data-send-btn
          style={{ gap: 8 }}
        >
          {activeTab.isLoading ? (
            <div
              style={{
                width: 15,
                height: 15,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
          ) : (
            <>
              Send
              <Send size={15} />
            </>
          )}
        </Button>
      </div>

      {/* cURL import toast */}
      {curlToast && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            background: "color-mix(in srgb, #4ADE80 10%, transparent)",
            border: "1px solid color-mix(in srgb, #4ADE80 30%, transparent)",
            borderRadius: 7,
            animation: "pgToast 150ms ease-out",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontSize: 12.5, color: "#4ADE80", fontWeight: 500 }}>
            cURL imported — method, headers and body applied
          </span>
        </div>
      )}

      {/* Resolved URL preview */}
      {!curlToast && request.url && previewUrl !== request.url && (
        <div
          style={{
            marginTop: 6,
            marginLeft: 2,
            fontSize: 11,
            color: "var(--text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {previewUrl}
        </div>
      )}
    </div>
  );
}
