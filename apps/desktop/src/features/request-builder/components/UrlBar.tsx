import { ChevronDown, Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  makeResolver,
  resolveForPreview,
  selectActiveEnv,
  useEnvStore,
} from "@/features/environments";
import { VarSuggestions } from "@/features/environments/components/VarSuggestions";
import { useVarAutocomplete } from "@/features/environments/hooks/useVarAutocomplete";
import {
  beginTabStream,
  endTabStream,
  UnresolvedVariablesError,
  useApiRequest,
} from "@/features/execution";
import { parseCurl } from "@/features/import-export";
import { HTTP_METHODS, methodTextClass } from "@/shared/lib/httpMethod";
import { extractEndpoint, splitUrlQuery } from "@/shared/lib/url";
import { cn } from "@/shared/lib/utils";
import type { HttpMethod } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { useTabStore } from "../store";

// Session-level "don't ask again" for the production send guardrail (R4b).
let prodGuardAcknowledged = false;

export function UrlBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const setTabLoading = useTabStore((s) => s.setTabLoading);
  const updateTabResponse = useTabStore((s) => s.updateTabResponse);
  const setTabName = useTabStore((s) => s.setTabName);
  const activeEnv = useEnvStore(selectActiveEnv);
  const globals = useEnvStore((s) => s.globals);
  const prod = activeEnv?.isProduction ?? false;
  const { sendRequest } = useApiRequest();

  const [methodOpen, setMethodOpen] = useState(false);
  const [curlToast, setCurlToast] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hoveredToken, setHoveredToken] = useState<TokenInfo | null>(null);
  const va = useVarAutocomplete();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const urlOverlayRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the syntax overlay scrolled in lockstep with the transparent input so
  // long URLs stay readable while arrow keys / wheel / selection move.
  const syncUrlOverlayScroll = () => {
    const input = urlInputRef.current;
    const overlay = urlOverlayRef.current;
    if (!(input && overlay)) return;
    if (overlay.scrollLeft !== input.scrollLeft) {
      overlay.scrollLeft = input.scrollLeft;
    }
  };

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
  // Re-sync after URL text changes (paste / store write) — caret scroll may
  // land before the overlay's content width updates.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional sync on url change
  useEffect(() => {
    requestAnimationFrame(syncUrlOverlayScroll);
  }, [activeTab?.request.url]);

  if (!activeTab) return null;

  const { request } = activeTab;

  /* Apply a raw URL, keeping the Params editor in sync with its query string
     in real time — edit the query and the params update on every keystroke. */
  const applyUrl = (raw: string) => {
    const { params } = splitUrlQuery(raw);
    const kv = params.map((p) => ({ key: p.key, value: p.value, enabled: true }));
    // updateTabRequest derives the tab name from the path when it isn't locked;
    // don't call setTabName here (that would lock it on the first keystroke).
    updateTabRequest(activeTab.id, { url: raw, params: kv });
  };

  /* ── {{variable}} autocomplete ── */
  const applyUrlAt = (next: string, caret: number) => {
    applyUrl(next);
    requestAnimationFrame(() => {
      urlInputRef.current?.focus();
      urlInputRef.current?.setSelectionRange(caret, caret);
      syncUrlOverlayScroll();
    });
  };

  const handleSend = async () => {
    if (!request.url) return;
    // Production guardrail: confirm destructive methods against a prod env (R4b).
    if (
      prod &&
      !prodGuardAcknowledged &&
      (request.method === "DELETE" || request.method === "PUT" || request.method === "PATCH")
    ) {
      const ok = confirm(
        `⚠️ ${request.method} against PRODUCTION environment "${activeEnv?.name}".\n\n` +
          `This can modify or delete live data. Continue?\n\n` +
          `(OK proceeds and won't ask again this session.)`,
      );
      if (!ok) return;
      prodGuardAcknowledged = true;
    }
    setSendError(null);
    setTabLoading(activeTab.id, true);
    updateTabResponse(activeTab.id, null);
    const { streamId, signal } = beginTabStream(activeTab.id);
    try {
      const result = await sendRequest(request, {
        streamId,
        signal,
        onSseMeta: (meta) => {
          updateTabResponse(activeTab.id, {
            status: meta.status,
            statusText: meta.statusText,
            headers: meta.headers,
            body: [],
            contentType: meta.contentType,
            responseTime: 0,
            size: 0,
            sse: true,
            sseEvents: [],
          });
        },
        onSseEvent: (ev) => {
          const prev = useTabStore.getState().tabs.find((t) => t.id === activeTab.id)?.response;
          if (!prev?.sse) return;
          updateTabResponse(activeTab.id, {
            ...prev,
            sseEvents: [...(prev.sseEvents ?? []), ev],
          });
        },
      });
      updateTabResponse(activeTab.id, result);
    } catch (e) {
      // Unresolved {{vars}} block the send — surface the message, don't fake a response.
      if (e instanceof UnresolvedVariablesError) {
        setSendError(e.message);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setSendError(null), 5000);
      } else {
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
      }
    } finally {
      endTabStream(activeTab.id);
      setTabLoading(activeTab.id, false);
    }
  };

  // Preview only expands {{vars}} — don't run parseUrl here or mid-typing
  // "https" becomes the nonsense "http://https".
  const previewUrl = resolveForPreview(request.url, activeEnv, globals);

  /* ── Method colour swatch for the trigger + the dropdown list ── */
  const methodTriggerClass = methodTextClass(request.method);
  /* ── Resolve one token name for the hover preview ── */
  const resolve = makeResolver(activeEnv, globals);
  const tokenInfo = (name: string): TokenInfo => {
    if (name.startsWith("$")) return { name, value: "generated per send", random: true };
    const value = resolve(name);
    return { name, value: value ?? null, random: false };
  };

  /* Split text into plain spans + hoverable {{token}} chips. */
  const renderTokens = (text: string, className: string, startOffset = 0) => {
    if (!text) return null;
    let offset = startOffset;
    return text.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
      const partStart = offset;
      offset += part.length;
      const m = part.match(/^\{\{([^}]+)\}\}$/);
      if (!m) {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional URL fragments
          <span key={`t-${i}`} className={className}>
            {part}
          </span>
        );
      }
      const info = tokenInfo(m[1].trim());
      return (
        <TokenChip
          // biome-ignore lint/suspicious/noArrayIndexKey: positional URL fragments
          key={`k-${i}`}
          token={part}
          missing={!info.random && info.value === null}
          onEnter={() => setHoveredToken(info)}
          onLeave={() => setHoveredToken((h) => (h?.name === info.name ? null : h))}
          onMouseDown={() => {
            const input = urlInputRef.current;
            input?.focus();
            input?.setSelectionRange(partStart + part.length, partStart + part.length);
          }}
        />
      );
    });
  };

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
        {renderTokens(scheme, "text-muted-foreground")}
        {renderTokens(host, "font-medium text-foreground", scheme.length)}
        {renderTokens(path, "font-medium text-primary", scheme.length + host.length)}
        {renderTokens(query, "text-muted-foreground", scheme.length + host.length + path.length)}
      </>
    );
  };

  return (
    <div className="flex min-w-0 flex-col border-b border-border bg-background px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        {/* Method selector */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            data-testid="method-trigger"
            onClick={() => setMethodOpen((o) => !o)}
            className={cn(
              "flex h-9 min-w-[104px] cursor-pointer items-center justify-between gap-2 rounded border bg-card px-3 font-mono text-code font-bold transition-colors",
              methodOpen ? "border-primary" : "border-border",
              methodTriggerClass,
            )}
          >
            <span>{request.method}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {methodOpen && (
            <div className="absolute left-0 top-10 z-[var(--z-dropdown)] w-[150px] rounded border border-border bg-popover p-1 shadow-lg">
              {HTTP_METHODS.map((m) => (
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

        {/* URL input — min-w-0 so long URLs shrink inside the flex row instead of blowing the panel out */}
        <div className="relative min-w-0 flex-1">
          <div className="relative flex h-9 w-full min-w-0 items-center overflow-hidden rounded border border-border bg-card">
            <input
              ref={urlInputRef}
              type="text"
              data-testid="url-input"
              value={request.url}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (!text) return;
                const trimmed = text.trim();

                // cURL command → parse method/headers/body/params
                if (trimmed.toLowerCase().startsWith("curl ")) {
                  const parsed = parseCurl(text);
                  if (parsed?.url) {
                    e.preventDefault();
                    updateTabRequest(activeTab.id, parsed);
                    if (!activeTab.nameLocked) {
                      setTabName(activeTab.id, extractEndpoint(parsed.url));
                    }
                    if (toastTimer.current) clearTimeout(toastTimer.current);
                    setCurlToast(true);
                    toastTimer.current = setTimeout(() => setCurlToast(false), 2500);
                  }
                  return;
                }

                // Plain URL with a query string → sync into Params (default paste
                // then flows through onChange). Guard: spaced pastes are left alone.
                if (trimmed.includes("?") && !/\s/.test(trimmed)) {
                  e.preventDefault();
                  applyUrl(trimmed);
                }
              }}
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
                applyUrl(raw);
                va.detect(raw, e.target.selectionStart ?? raw.length);
              }}
              onScroll={syncUrlOverlayScroll}
              onSelect={syncUrlOverlayScroll}
              onWheel={(e) => {
                // Text inputs often ignore trackpad/wheel; scroll horizontally so
                // the caret (and synced overlay) can reach the end of long URLs.
                const el = e.currentTarget;
                if (el.scrollWidth <= el.clientWidth) return;
                const dx =
                  Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
                if (dx === 0) return;
                const max = el.scrollWidth - el.clientWidth;
                const next = Math.max(0, Math.min(max, el.scrollLeft + dx));
                if (next === el.scrollLeft) return;
                e.preventDefault();
                el.scrollLeft = next;
                syncUrlOverlayScroll();
              }}
              onKeyUp={(e) => {
                syncUrlOverlayScroll();
                va.detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
              }}
              onClick={(e) => {
                syncUrlOverlayScroll();
                va.detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
              }}
              onBlur={() => setTimeout(va.close, 120)}
              onKeyDown={(e) => {
                if (
                  va.onKeyDown(
                    e,
                    e.currentTarget.value,
                    e.currentTarget.selectionStart ?? 0,
                    applyUrlAt,
                  )
                ) {
                  return;
                }
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="https://api.example.com/endpoint"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              className="absolute inset-0 z-[var(--z-raised)] bg-transparent px-3 font-mono text-code text-transparent caret-foreground outline-none"
            />
            <div
              ref={urlOverlayRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[var(--z-raised)] overflow-hidden px-3"
            >
              <div className="flex h-full min-w-max items-center whitespace-nowrap font-mono text-code">
                {renderUrlSegments(request.url)}
              </div>
            </div>
          </div>

          {/* {{variable}} autocomplete */}
          {va.open && (
            <VarSuggestions
              items={va.items}
              index={va.index}
              onHover={va.setIndex}
              onPick={(name) => {
                const el = urlInputRef.current;
                va.commit(
                  name,
                  el?.value ?? request.url,
                  el?.selectionStart ?? request.url.length,
                  applyUrlAt,
                );
              }}
              className="left-0 top-[calc(100%+4px)]"
            />
          )}
        </div>

        {/* Send — red in production (R4b) */}
        <Button
          variant={prod ? "danger-filled" : "primary"}
          onClick={handleSend}
          disabled={!request.url || activeTab.isLoading}
          data-send-btn
          title={prod ? `Production: ${activeEnv?.name}` : undefined}
          className="gap-1.5 w-[80px] shrink-0 h-9"
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

      {/* Unresolved-variable error (send blocked) */}
      {sendError && (
        <div
          data-testid="send-error"
          style={{ animation: "pgToast 150ms ease-out" }}
          className="mt-1.5 flex items-center gap-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-1"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-destructive"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-xs font-medium text-destructive">{sendError}</span>
        </div>
      )}

      {/* Hovered {{token}} → resolved value (per-request env preview) */}
      {hoveredToken && !sendError && (
        <div className="ml-0.5 mt-1 flex items-center gap-1.5 truncate text-2xs">
          <span className="font-mono text-[color:var(--var-token)]">{`{{${hoveredToken.name}}}`}</span>
          <span className="text-muted-foreground">→</span>
          {hoveredToken.value === null ? (
            <span className="text-destructive">unresolved</span>
          ) : (
            <span
              className={cn(
                "truncate font-mono",
                hoveredToken.random ? "text-muted-foreground italic" : "text-foreground",
              )}
            >
              {hoveredToken.value}
            </span>
          )}
        </div>
      )}

      {/* Resolved URL preview */}
      {!(curlToast || sendError || hoveredToken) && request.url && previewUrl !== request.url && (
        <div className="ml-0.5 mt-1 truncate text-2xs text-muted-foreground">{previewUrl}</div>
      )}
    </div>
  );
}

interface TokenInfo {
  name: string;
  value: string | null;
  random: boolean;
}

function TokenChip({
  token,
  missing,
  onEnter,
  onLeave,
  onMouseDown,
}: {
  token: string;
  missing: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onMouseDown: () => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover-only preview enhancement inside a display overlay; the resolved value is non-essential (also shown in the URL preview line) and needs no keyboard path
    <span
      data-testid="env-token"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown();
      }}
      className={cn(
        "pointer-events-auto cursor-help font-medium",
        missing
          ? "text-destructive underline decoration-dotted underline-offset-2"
          : "text-[color:var(--var-token)]",
      )}
    >
      {token}
    </span>
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
  const cls = methodTextClass(method);
  const dotCls = cls.replace("text-", "bg-");
  return (
    <button
      type="button"
      role="option"
      data-testid={`method-option-${method}`}
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
