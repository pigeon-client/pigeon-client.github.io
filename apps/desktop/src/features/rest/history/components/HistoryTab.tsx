import { MethodBadge } from "@pigeon/ui";
import { useMemo, useState } from "react";
import { EmptyState } from "@/shared/ui/EmptyState";
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
        height: 30,
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

/* ── History tab content ── */
export function HistoryTab({
  search,
  onLoad,
}: {
  search: string;
  onLoad: (item: HistoryItem) => void;
}) {
  const history = useHistoryStore((s) => s.history);
  const removeHistory = useHistoryStore((s) => s.removeHistory);

  const groupedHistory = useMemo(() => {
    const buckets: Record<string, HistoryItem[]> = {};
    const order = ["Today", "Yesterday", "This Week", "Last Week", "Older"];
    for (const item of history) {
      if (!matchesSearch(item.name || item.url, search)) continue;
      const b = getDateBucket(item.timestamp);
      if (!buckets[b]) buckets[b] = [];
      buckets[b].push(item);
    }
    for (const k of Object.keys(buckets)) buckets[k].sort((a, b) => b.timestamp - a.timestamp);
    return { buckets, order: order.filter((b) => buckets[b]?.length) };
  }, [history, search]);

  if (groupedHistory.order.length === 0) {
    return (
      <EmptyState
        icon="📭"
        label={search ? "No matching history" : "No history yet"}
        sub="Send a request to see it here"
      />
    );
  }

  return (
    <>
      {groupedHistory.order.map((bucket) => (
        <div key={bucket}>
          <SectionHeader label={bucket} />
          {groupedHistory.buckets[bucket].map((item) => (
            <HistoryRow
              key={item.timestamp}
              item={item}
              onLoad={() => onLoad(item)}
              onDelete={() => removeHistory(history.indexOf(item))}
            />
          ))}
        </div>
      ))}
    </>
  );
}
