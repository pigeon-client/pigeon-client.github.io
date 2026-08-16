import { EmptyState, MethodBadge } from "@pigeon/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SidebarLoadingState } from "@/shared/ui/SidebarLoadingState";
import { useHistoryStore } from "../store";
import type { HistoryItem } from "../types";

function matchesSearch(text: string, search: string): boolean {
  return !search || text.toLowerCase().includes(search.toLowerCase());
}

/* ── Date grouping ── */
function getDateBucket(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const dayMs = 86400000;
  if (diff < dayMs) return "Today";
  if (diff < 2 * dayMs) return "Yesterday";
  if (diff < 7 * dayMs) return "This Week";
  if (diff < 14 * dayMs) return "Last Week";
  return "Older";
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

const BUCKET_ORDER = ["Today", "Yesterday", "This Week", "Last Week", "Older"];
const HISTORY_ROW_HEIGHT = 30;
const SECTION_HEADER_HEIGHT = 33;

type FlatRow =
  | { type: "header"; bucket: string }
  | { type: "row"; item: HistoryItem; index: number };

function findHistoryDeleteIndex(
  history: HistoryItem[],
  item: HistoryItem,
  fallbackIndex: number,
): number {
  if (item.id !== undefined) {
    const byId = history.findIndex((h) => h.id === item.id);
    if (byId !== -1) return byId;
  }
  return fallbackIndex;
}

function rowKey(item: HistoryItem): number {
  return item.id ?? item.timestamp;
}

function scrollMarginOf(el: HTMLElement, scrollParent: HTMLElement): number {
  return (
    el.getBoundingClientRect().top -
    scrollParent.getBoundingClientRect().top +
    scrollParent.scrollTop
  );
}

function flattenHistory(history: HistoryItem[], search: string): FlatRow[] {
  const buckets: Record<string, { item: HistoryItem; index: number }[]> = {};
  for (let i = 0; i < history.length; i++) {
    const item = history[i];
    if (!matchesSearch(item.name || item.url, search)) continue;
    const b = getDateBucket(item.timestamp);
    if (!buckets[b]) buckets[b] = [];
    buckets[b].push({ item, index: i });
  }
  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => b.item.timestamp - a.item.timestamp);
  }
  const rows: FlatRow[] = [];
  for (const bucket of BUCKET_ORDER) {
    const entries = buckets[bucket];
    if (!entries?.length) continue;
    rows.push({ type: "header", bucket });
    for (const entry of entries) {
      rows.push({ type: "row", item: entry.item, index: entry.index });
    }
  }
  return rows;
}

/* ── Section header in file tree ── */
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 8px 5px" }}>
      <span
        style={{
          fontSize: "var(--text-2xs)",
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

/* ── History row (compact badge style) ── */
function HistoryRow({
  item,
  onLoad,
  onDelete,
}: {
  item: HistoryItem;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const sc = item.statusCode;
  const statusColor =
    sc >= 200 && sc < 300
      ? "var(--status-2xx)"
      : sc >= 400
        ? "var(--status-5xx)"
        : sc >= 300
          ? "var(--status-3xx)"
          : "var(--text-secondary)";

  return (
    <button
      type="button"
      onClick={onLoad}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        height: HISTORY_ROW_HEIGHT,
        borderRadius: "var(--radius)",
        cursor: "pointer",
        paddingLeft: 8,
        paddingRight: 10,
        background: hovered ? "var(--bg-elevated)" : "transparent",
        margin: "0 4px",
        transition: "background 0.1s",
        width: "100%",
        border: "none",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <MethodBadge method={item.method} />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          fontWeight: 500,
          color: "var(--text-primary)",
          marginLeft: 9,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
        }}
      >
        {item.name || item.url?.split("/").pop() || item.url}
      </span>
      {sc > 0 && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: statusColor,
            marginLeft: 6,
            flexShrink: 0,
          }}
        >
          {sc}
        </span>
      )}
      <span
        style={{
          fontSize: "var(--text-2xs)",
          color: "var(--text-secondary)",
          flexShrink: 0,
          marginLeft: 4,
        }}
      >
        {formatTime(item.timestamp)}
      </span>
      {hovered && (
        <button
          type="button"
          aria-label="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            borderRadius: "var(--radius)",
            color: "var(--text-secondary)",
            marginLeft: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
          className="hover:text-status-5xx"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
    </button>
  );
}

function HistoryRowList({
  rows,
  history,
  onLoad,
  onDelete,
}: {
  rows: FlatRow[];
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (localIndex: number) => void;
}) {
  return (
    <>
      {rows.map((row) =>
        row.type === "header" ? (
          <SectionHeader key={`header:${row.bucket}`} label={row.bucket} />
        ) : (
          <HistoryRow
            key={rowKey(row.item)}
            item={row.item}
            onLoad={() => onLoad(row.item)}
            onDelete={() => onDelete(findHistoryDeleteIndex(history, row.item, row.index))}
          />
        ),
      )}
    </>
  );
}

/* ── History tab content ── */
export function HistoryTab({
  search,
  onLoad,
}: {
  search: string;
  onLoad: (item: HistoryItem) => void;
}) {
  const history = useHistoryStore((s) => s.history);
  const loaded = useHistoryStore((s) => s.loaded);
  const removeHistory = useHistoryStore((s) => s.removeHistory);

  const virtualRows = useMemo(() => flattenHistory(history, search), [history, search]);

  const listRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [didLookUp, setDidLookUp] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    const parent = list?.parentElement ?? null;
    setScrollEl(parent);
    setDidLookUp(true);
    if (list && parent) setScrollMargin(scrollMarginOf(list, parent));
  }, [search, loaded, virtualRows.length]);

  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => scrollEl,
    estimateSize: (index) =>
      virtualRows[index]?.type === "header" ? SECTION_HEADER_HEIGHT : HISTORY_ROW_HEIGHT,
    overscan: 8,
    scrollMargin,
    enabled: loaded && virtualRows.length > 0 && scrollEl != null,
    getItemKey: (index) => {
      const row = virtualRows[index];
      if (!row) return index;
      return row.type === "header" ? `header:${row.bucket}` : rowKey(row.item);
    },
  });

  let body: ReactNode;
  if (!loaded) {
    body = <SidebarLoadingState label="Loading history…" />;
  } else if (virtualRows.length === 0) {
    body = (
      <EmptyState
        icon="📭"
        label={search ? "No matching history" : "No history yet"}
        sub="Send a request to see it here"
      />
    );
  } else if (scrollEl) {
    body = (
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vItem) => {
          const row = virtualRows[vItem.index];
          if (!row) return null;
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
              }}
            >
              {row.type === "header" ? (
                <SectionHeader label={row.bucket} />
              ) : (
                <HistoryRow
                  item={row.item}
                  onLoad={() => onLoad(row.item)}
                  onDelete={() =>
                    removeHistory(findHistoryDeleteIndex(history, row.item, row.index))
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    );
  } else if (didLookUp) {
    body = (
      <HistoryRowList
        rows={virtualRows}
        history={history}
        onLoad={onLoad}
        onDelete={removeHistory}
      />
    );
  } else {
    body = null;
  }

  return <div ref={listRef}>{body}</div>;
}
