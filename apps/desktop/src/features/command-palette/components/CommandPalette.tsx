import { cn, Input, Menu, Modal } from "@pigeon/ui";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_BODY, utf8Bytes } from "@/core/http";
import { methodTextClass } from "@/shared/lib/httpMethod";
import { useCollectionStore } from "../../rest/collections/store";
import { useHistoryStore } from "../../rest/history/store";
import { useTabStore } from "../../rest/request-builder/store";
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

  const items = useMemo(
    () => collectPaletteItems({ history, drafts, collections }),
    [history, drafts, collections],
  );
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => searchPalette(items, deferredQuery), [items, deferredQuery]);

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
    void (async () => {
      const req = result.request;
      const origin =
        result.source === "collection" && result.collectionId && result.nodeId
          ? { collectionId: result.collectionId, nodeId: result.nodeId }
          : null;
      const { openRequestTab, updateTabResponse } = useTabStore.getState();
      const id = openRequestTab(req, origin);
      if (result.source === "history") {
        const parsedId = Number(result.key.slice("history:".length));
        const historyItem = useHistoryStore
          .getState()
          .history.find(
            (h) =>
              (h.id !== undefined && h.id === parsedId) ||
              (h.timestamp === result.timestamp && h.url === result.url),
          );
        const hydrated = historyItem
          ? await useHistoryStore.getState().ensureSnapshot(historyItem)
          : null;
        const snap = hydrated?.snapshot ?? result.snapshot;
        if (snap) {
          updateTabResponse(id, {
            status: snap.status,
            statusText: snap.statusText,
            headers: {},
            body: snap.bodyText ? utf8Bytes(snap.bodyText) : EMPTY_BODY,
            contentType: snap.contentType,
            responseTime: result.responseTime ?? 0,
            size: snap.size,
            resolvedUrl: result.url,
            sentHeaders: {},
            snapshotTimestamp: result.timestamp,
            snapshotTruncated: snap.truncated,
          });
        }
      }
      onClose();
    })();
  };

  return (
    <Modal onClose={onClose} width={640} className="max-h-[70vh]">
      <div data-testid="command-palette" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Input
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
          size="lg"
          className="h-12 shrink-0 rounded-none border-0 border-b border-border bg-transparent px-4 text-code shadow-none focus-visible:ring-0"
        />

        <Menu
          ref={listRef}
          className="relative z-auto min-h-0 flex-1 rounded-none border-0 p-1.5 shadow-none"
        >
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
        </Menu>
      </div>
    </Modal>
  );
}
