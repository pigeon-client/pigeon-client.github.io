import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiResponse } from "@/core/http";
import { useCollectionStore } from "@/features/rest/collections";
import { useHistoryStore } from "@/features/rest/history";
import { useTabStore } from "@/features/rest/request-builder";
import { methodTextClass } from "@/shared/lib/httpMethod";
import { cn } from "@/shared/lib/utils";
import {
  collectPaletteItems,
  hostOf,
  type PaletteResult,
  relativeTime,
  searchPalette,
} from "../lib/search";

const SOURCE_BADGE_LIMIT = 18;

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const history = useHistoryStore((s) => s.history);
  const drafts = useHistoryStore((s) => s.drafts);
  const collections = useCollectionStore((s) => s.collections);
  const tabs = useTabStore((s) => s.tabs);
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const updateTabResponse = useTabStore((s) => s.updateTabResponse);

  const items = useMemo(
    () => collectPaletteItems({ history, drafts, collections }),
    [history, drafts, collections],
  );
  const results = useMemo(() => searchPalette(items, query), [items, query]);

  useEffect(() => {
    setIndex(0);
  }, []);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const row = listRef.current?.querySelector(`[data-testid="command-palette-result-${index}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const openResult = (result: PaletteResult) => {
    const req = result.request;
    let id: string;
    if (tabs.length === 1 && !tabs[0].request.url) {
      id = tabs[0].id;
      updateTabRequest(id, req);
    } else {
      id = addTab();
      updateTabRequest(id, req);
    }
    setActiveTab(id);
    if (result.source === "history" && result.snapshot) {
      const snap = result.snapshot;
      const response: ApiResponse = {
        status: snap.status,
        statusText: snap.statusText,
        headers: {},
        body: snap.bodyText ? Array.from(new TextEncoder().encode(snap.bodyText)) : [],
        contentType: snap.contentType,
        responseTime: result.responseTime ?? 0,
        size: snap.size,
        resolvedUrl: result.url,
        sentHeaders: {},
        snapshotTimestamp: result.timestamp,
        snapshotTruncated: snap.truncated,
      };
      updateTabResponse(id, response);
    }
    onClose();
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: backdrop div must remain a div so click events propagate to onClick for click-outside-to-close
    <div
      role="button"
      tabIndex={0}
      aria-label="Close command palette"
      onClick={onClose}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Escape" || e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          onClose();
        }
      }}
      style={{ animation: "pgFade 120ms ease-out" }}
      className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-black/60 pt-[12vh] backdrop-blur-[8px]"
    >
      <div
        data-testid="command-palette"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        style={{ width: 640, maxWidth: "calc(100vw - 48px)", animation: "pgPop 150ms ease-out" }}
        className="flex max-h-[70vh] flex-col overflow-hidden rounded border border-border bg-card shadow-modal"
      >
        <input
          ref={inputRef}
          data-testid="command-palette-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const result = results[index];
              if (result) openResult(result);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Search history, drafts, and collections…"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          className="h-12 shrink-0 border-b border-border bg-transparent px-4 font-mono text-code text-foreground outline-none placeholder:text-muted-foreground"
        />

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {query.trim() === "" ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Type to search every request — history, drafts, and collections.
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No matching requests.
            </div>
          ) : (
            results.map((result, i) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: list row, keyboard nav lives on the input above
              <div
                key={result.key}
                data-testid={`command-palette-result-${i}`}
                onMouseEnter={() => setIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  openResult(result);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2",
                  i === index ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <span
                  className={cn(
                    "w-[52px] shrink-0 truncate font-mono text-2xs font-bold",
                    methodTextClass(result.method),
                  )}
                >
                  {result.method}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-code text-foreground">
                    {result.name || result.url}
                  </div>
                  <div className="truncate text-2xs text-muted-foreground">
                    {hostOf(result.url)}
                  </div>
                </div>
                <span className="shrink-0 truncate rounded border border-border px-1.5 py-0.5 text-2xs text-muted-foreground">
                  {result.sourceLabel.length > SOURCE_BADGE_LIMIT
                    ? `${result.sourceLabel.slice(0, SOURCE_BADGE_LIMIT)}…`
                    : result.sourceLabel}
                </span>
                {result.timestamp !== undefined && (
                  <span className="shrink-0 text-2xs text-muted-foreground">
                    {relativeTime(result.timestamp)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
