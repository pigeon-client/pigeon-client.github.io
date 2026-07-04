import { ChevronDown, Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { extractEndpoint, parseUrl } from "@/shared/lib/url";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { useApiRequest } from "../hooks/useApiRequest";
import { replaceEnvVariables } from "../lib/env";
import { parseCurl } from "../services/curlService";
import { useEnvStore } from "../store/envStore";
import { useTabStore } from "../store/tabStore";
import type { HttpMethod } from "../types";

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

  /* ── Method colour swatch for the trigger + the dropdown list ── */
  const methodTriggerClass =
    request.method === "GET"
      ? "text-method-get"
      : request.method === "POST"
        ? "text-method-post"
        : request.method === "PUT"
          ? "text-method-put"
          : request.method === "PATCH"
            ? "text-method-patch"
            : request.method === "DELETE"
              ? "text-method-delete"
              : request.method === "HEAD"
                ? "text-method-head"
                : "text-method-options";

  /* ── Syntax-tinted URL display ── */
  const renderUrlSegments = (url: string) => {
    if (!url) {
      return (
        <span className="font-mono text-muted-foreground">https://api.example.com/endpoint</span>
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
        <span className="text-muted-foreground">{scheme}</span>
        <span className="font-medium text-foreground">{host}</span>
        <span className="font-medium text-primary">{path}</span>
        <span className="text-muted-foreground">{query}</span>
      </>
    );
  };

  return (
    <div className="flex flex-col border-b border-border bg-background px-4 py-2.5">
      <div className="flex items-center gap-2">
        {/* Method selector */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setMethodOpen((o) => !o)}
            className={cn(
              "flex h-9 w-[104px] cursor-pointer items-center justify-between gap-2 rounded border bg-card px-3 font-mono text-[13px] font-bold transition-colors",
              methodOpen ? "border-primary" : "border-border",
              methodTriggerClass,
            )}
          >
            <span>{request.method}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {methodOpen && (
            <div className="absolute left-0 top-10 z-40 w-[150px] rounded border border-border bg-popover p-1 shadow-lg">
              {METHODS.map((m) => (
                <MethodOption
                  key={m}
                  method={m}
                  active={m === request.method}
                  onSelect={() => {
                    updateTabRequest(activeTab.id, { method: m });
                    setMethodOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* URL input */}
        <div className="relative flex h-9 flex-1 items-center overflow-hidden rounded border border-border bg-card px-3">
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
            className="absolute inset-0 z-[2] bg-transparent px-3 font-mono text-[13px] text-transparent caret-foreground outline-none"
          />
          <div className="pointer-events-none z-[1] select-none truncate font-mono text-[13px]">
            {renderUrlSegments(request.url)}
          </div>
        </div>

        {/* Send */}
        <Button
          variant="primary"
          size="sm"
          onClick={handleSend}
          disabled={!request.url || activeTab.isLoading}
          data-send-btn
          className="gap-1.5 w-[80px] shrink-0"
        >
          {activeTab.isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              Send
              <Send className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>

      {/* cURL import toast */}
      {curlToast && (
        <div
          style={{ animation: "pgToast 150ms ease-out" }}
          className="mt-1.5 flex items-center gap-2 rounded border border-status-2xx/30 bg-status-2xx/10 px-3 py-1"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-status-2xx"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-xs font-medium text-status-2xx">
            cURL imported — method, headers and body applied
          </span>
        </div>
      )}

      {/* Resolved URL preview */}
      {!curlToast && request.url && previewUrl !== request.url && (
        <div className="ml-0.5 mt-1 truncate text-[11px] text-muted-foreground">{previewUrl}</div>
      )}
    </div>
  );
}

function MethodOption({
  method,
  active,
  onSelect,
}: {
  method: HttpMethod;
  active: boolean;
  onSelect: () => void;
}) {
  const cls =
    method === "GET"
      ? "text-method-get"
      : method === "POST"
        ? "text-method-post"
        : method === "PUT"
          ? "text-method-put"
          : method === "PATCH"
            ? "text-method-patch"
            : method === "DELETE"
              ? "text-method-delete"
              : method === "HEAD"
                ? "text-method-head"
                : "text-method-options";
  const dotCls = cls.replace("text-", "bg-");
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "flex h-7 w-full cursor-pointer items-center gap-2 rounded px-2 text-left font-mono text-xs font-semibold transition-colors",
        active ? "bg-accent text-foreground" : "text-foreground hover:bg-accent",
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotCls)} />
      <span className={cls}>{method}</span>
    </button>
  );
}
