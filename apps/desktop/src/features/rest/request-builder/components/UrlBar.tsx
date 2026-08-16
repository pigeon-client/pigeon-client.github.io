import { Button } from "@pigeon/ui";
import { CircleStop, Send } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import {
  beginTabStream,
  cancelTabStream,
  endTabStream,
  UnresolvedVariablesError,
} from "@/core/http";
import { useInputCaretAnchor } from "@/shared/lib/inputCaretPosition";
import { formatTokenTooltip, getTokenPreview } from "@/shared/lib/tokenPreview";
import { extractEndpoint, splitUrlQuery } from "@/shared/lib/url";
import { TokenChip } from "@/shared/ui/TokenChip";
import { VarSuggestions } from "../../../environments/components/VarSuggestions";
import { useVarAutocomplete } from "../../../environments/hooks/useVarAutocomplete";
import { makeResolver, resolveForPreview } from "../../../environments/lib/resolve";
import { selectActiveEnv, useEnvStore } from "../../../environments/store";
import { parseCurl } from "../../import-export/services/curlService";
import { useSendRequest } from "../hooks/useSendRequest";
import { useTabStore } from "../store";
import { MethodSelector } from "./MethodSelector";
import { UrlBarStatusLine } from "./UrlBarStatusLine";

// Session-level "don't ask again" for the production send guardrail (R4b).
let prodGuardAcknowledged = false;

export const UrlBar = memo(function UrlBar({ tabId }: { tabId: string }) {
  const request = useTabStore((s) => s.tabs.find((t) => t.id === tabId)?.request);
  const isLoading = useTabStore((s) => s.tabs.find((t) => t.id === tabId)?.isLoading ?? false);
  const nameLocked = useTabStore((s) => s.tabs.find((t) => t.id === tabId)?.nameLocked ?? false);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const setTabLoading = useTabStore((s) => s.setTabLoading);
  const updateTabResponse = useTabStore((s) => s.updateTabResponse);
  const setTabName = useTabStore((s) => s.setTabName);
  const activeEnv = useEnvStore(selectActiveEnv);
  const globals = useEnvStore((s) => s.globals);
  const prod = activeEnv?.isProduction ?? false;
  const { sendRequest } = useSendRequest();

  const [methodOpen, setMethodOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
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

  const varMenuAnchor = useInputCaretAnchor(urlInputRef, va.caret, va.open, request?.url ?? "");
  // Re-sync after URL text changes (paste / store write) — caret scroll may
  // land before the overlay's content width updates.
  useEffect(() => {
    requestAnimationFrame(syncUrlOverlayScroll);
  }, [request?.url]);

  if (!request) return null;

  /* Apply a raw URL, keeping the Params editor in sync with its query string
     in real time — edit the query and the params update on every keystroke. */
  const applyUrl = (raw: string) => {
    const { params } = splitUrlQuery(raw);
    const kv = params.map((p) => ({ key: p.key, value: p.value, enabled: true }));
    // updateTabRequest derives the tab name from the path when it isn't locked;
    // don't call setTabName here (that would lock it on the first keystroke).
    updateTabRequest(tabId, { url: raw, params: kv });
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
    setTabLoading(tabId, true);
    updateTabResponse(tabId, null);
    const { streamId, signal } = beginTabStream(tabId);
    try {
      const result = await sendRequest(request, {
        streamId,
        signal,
        onSseMeta: (meta) => {
          updateTabResponse(tabId, {
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
          const prev = useTabStore.getState().tabs.find((t) => t.id === tabId)?.response;
          if (!prev?.sse) return;
          updateTabResponse(tabId, {
            ...prev,
            sseEvents: [...(prev.sseEvents ?? []), ev],
          });
        },
      });
      // A cancelled request just clears loading below — no response, no toast.
      if (!result.cancelled) {
        updateTabResponse(tabId, result);
      }
    } catch (e) {
      // Unresolved {{vars}} block the send — surface the message, don't fake a response.
      if (e instanceof UnresolvedVariablesError) {
        setSendError(e.message);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setSendError(null), 5000);
      } else {
        updateTabResponse(tabId, {
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
      endTabStream(tabId);
      setTabLoading(tabId, false);
    }
  };

  const handleCancel = () => {
    cancelTabStream(tabId);
  };

  // Preview only expands {{vars}} — don't run parseUrl here or mid-typing
  // "https" becomes the nonsense "http://https".
  const previewUrl = resolveForPreview(request.url, activeEnv, globals);

  /* ── Resolve one token name for the hover preview ── */
  const resolve = makeResolver(activeEnv, globals);
  const tokenInfo = (name: string) => getTokenPreview(name, resolve);

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
          tooltip={formatTokenTooltip(info)}
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
        <MethodSelector
          method={request.method}
          open={methodOpen}
          setOpen={setMethodOpen}
          dropdownRef={dropdownRef}
          onSelect={(m) => updateTabRequest(tabId, { method: m })}
        />

        {/* URL input — min-w-0 so long URLs shrink inside the flex row instead of blowing the panel out */}
        <div className="relative min-w-0 flex-1">
          <div className="relative flex h-9 w-full min-w-0 items-center overflow-hidden rounded bg-card">
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
                    updateTabRequest(tabId, parsed);
                    if (!nameLocked) {
                      setTabName(tabId, extractEndpoint(parsed.url));
                    }
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
                    updateTabRequest(tabId, parsed);
                    if (!nameLocked && parsed.url) {
                      setTabName(tabId, extractEndpoint(parsed.url));
                    }
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
                if (va.onKeyDownField(e, e.currentTarget)) {
                  syncUrlOverlayScroll();
                  return;
                }
              }}
              placeholder="https://api.example.com/endpoint"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              className="absolute inset-0 z-raised bg-transparent px-3 font-mono text-code text-transparent caret-foreground outline-none"
            />
            <div
              ref={urlOverlayRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-raised overflow-hidden px-3"
            >
              <div className="flex h-full min-w-max items-center whitespace-nowrap font-mono text-code">
                {renderUrlSegments(request.url)}
              </div>
            </div>
          </div>

          {/* {{variable}} autocomplete */}
          {va.open && varMenuAnchor && (
            <VarSuggestions
              items={va.items}
              index={va.index}
              onHover={va.setIndex}
              onPick={(name) => {
                const el = urlInputRef.current;
                if (el) {
                  va.commitField(name, el);
                  syncUrlOverlayScroll();
                }
              }}
              style={{
                position: "fixed",
                top: varMenuAnchor.top,
                left: varMenuAnchor.left,
              }}
            />
          )}
        </div>

        {/* Send — red in production (R4b); becomes Cancel while a request is in flight */}
        <Button
          variant={isLoading ? "outline" : prod ? "danger-filled" : "primary"}
          onClick={isLoading ? handleCancel : handleSend}
          disabled={!(isLoading || request.url)}
          data-send-btn
          title={isLoading ? "Cancel request" : prod ? `Production: ${activeEnv?.name}` : undefined}
          className="gap-1.5 w-[80px] shrink-0 h-9"
        >
          {isLoading ? (
            <>
              Cancel
              <CircleStop className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Send
              <Send className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>

      <UrlBarStatusLine sendError={sendError} url={request.url} previewUrl={previewUrl} />
    </div>
  );
});
