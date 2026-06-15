import { ChevronRight, Search, Upload, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { extractPathSegments, parseUrl } from "../lib/url";
import { useCollectionStore } from "../store/collectionStore";
import { useHistoryStore } from "../store/historyStore";
import { useTabStore } from "../store/tabStore";
import type { CollectionNode, HistoryItem, RequestConfig } from "../types";
import { METHOD_COLORS, MethodBadge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Tab } from "./ui/Tab";

type SidebarTab = "history" | "draft" | "collections";

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
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 8px 5px" }}>
      <span
        style={{
          fontSize: 10.5,
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

/* ── File tree row ── */
interface TreeRowProps {
  depth: number;
  isFolder?: boolean;
  label: string;
  method?: string;
  meta?: string;
  expanded?: boolean;
  iconColor?: string;
  showCount?: boolean;
  count?: number;
  onClick?: () => void;
  onDelete?: () => void;
}

function TreeRow({
  depth,
  isFolder = false,
  label,
  method,
  meta,
  expanded,
  iconColor,
  showCount,
  count,
  onClick,
  onDelete,
}: TreeRowProps) {
  const [hovered, setHovered] = useState(false);
  const mc = method ? (METHOD_COLORS[method] ?? "#94A3B8") : undefined;

  const depthGuides = useMemo(() => {
    const guides: React.ReactNode[] = [];
    for (let i = 0; i < depth; i++) {
      guides.push(
        <span
          key={`guide-${i}`}
          style={{
            flexShrink: 0,
            width: 14,
            alignSelf: "stretch",
            borderLeft: "1px solid var(--border)",
            marginLeft: 6,
          }}
        />,
      );
    }
    return guides;
  }, [depth]);

  return (
    <div
      role="treeitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        height: 28,
        borderRadius: 6,
        cursor: "pointer",
        paddingLeft: 4 + depth * 14,
        paddingRight: 10,
        background: hovered ? "var(--bg-elevated)" : "transparent",
        transition: "background 0.1s",
        margin: "0 4px",
        minWidth: depth >= 5 ? "max-content" : undefined,
      }}
    >
      {/* Depth guides */}
      {depthGuides}

      {isFolder ? (
        <>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: 16,
              color: "var(--text-secondary)",
              transform: expanded ? "rotate(90deg)" : "none",
              transition: "transform 120ms ease",
            }}
          >
            <ChevronRight size={12} strokeWidth={2.6} />
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={iconColor ?? "var(--accent)"}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, marginRight: 7 }}
            aria-hidden="true"
            focusable="false"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              fontWeight: depth === 0 ? 600 : 500,
              color: depth === 0 ? "var(--text-primary)" : "var(--text-secondary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </span>
          {showCount && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: "0 7px",
                marginLeft: 8,
                flexShrink: 0,
              }}
            >
              {count}
            </span>
          )}
        </>
      ) : (
        <>
          {/* Request row */}
          {method && mc ? (
            <>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: mc,
                  flexShrink: 0,
                  width: 52,
                }}
              >
                {method}
              </span>
              <span
                style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </span>
            </>
          ) : (
            <>
              <span style={{ flexShrink: 0, width: 17 }} />
              <span
                style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </span>
            </>
          )}
          <span
            style={{
              flexShrink: 0,
              fontSize: 10.5,
              color: "var(--text-secondary)",
              paddingLeft: 8,
              whiteSpace: "nowrap",
            }}
          >
            {meta}
          </span>
          {onDelete && hovered && (
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
                borderRadius: 3,
                color: "var(--text-secondary)",
                marginLeft: 4,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
              className="hover:text-[#F87171]"
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
        </>
      )}
    </div>
  );
}

/* ── Nested collection tree node ── */
function CollectionTreeNode({
  node,
  depth,
  onSelect,
  onDelete,
  collectionId,
}: {
  node: CollectionNode;
  depth: number;
  onSelect: (req: RequestConfig) => void;
  onDelete?: (id: string) => void;
  collectionId?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const removeNode = useCollectionStore((s) => s.removeNode);

  if (node.type === "request") {
    return (
      <TreeRow
        depth={depth}
        isFolder={false}
        label={node.name}
        method={node.method}
        onClick={() => node.request && onSelect(node.request)}
        onDelete={collectionId ? () => removeNode(collectionId, node.id) : undefined}
      />
    );
  }

  return (
    <>
      <TreeRow
        depth={depth}
        isFolder
        label={node.name}
        expanded={expanded}
        showCount={depth === 0}
        count={(node.children ?? []).length}
        onClick={() => setExpanded((e) => !e)}
      />
      {expanded &&
        (node.children ?? []).map((child) => (
          <CollectionTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            onDelete={onDelete}
            collectionId={collectionId}
          />
        ))}
    </>
  );
}

/** Internal node with extra runtime metadata */
type InternalNode = CollectionNode & {
  _meta?: string;
  _recent?: boolean;
  _count?: number;
};

/* ── Build auto-organized tree from URL list ── */
function buildUrlTree(
  reqs: Array<{
    method: string;
    url: string;
    meta?: string;
    recent?: boolean;
    request?: RequestConfig;
  }>,
): CollectionNode[] {
  const nodes: Record<string, CollectionNode> = {};
  const top: CollectionNode[] = [];

  const ensure = (id: string, label: string, arr: CollectionNode[]): CollectionNode => {
    if (!nodes[id]) {
      nodes[id] = { id, name: label, type: "folder", children: [] };
      arr.push(nodes[id]);
    }
    return nodes[id];
  };

  for (const r of reqs) {
    const normalized =
      r.url.startsWith("http://") || r.url.startsWith("https://") ? r.url : parseUrl(r.url);
    const segs = extractPathSegments(normalized);
    const hostMatch = normalized.match(/^https?:\/\/([^/]+)/i);
    const host = hostMatch ? hostMatch[1] : "";
    const labels = host.split(".").filter(Boolean);
    let domain = host;
    let sub = "";
    if (labels.length > 2) {
      domain = labels.slice(-2).join(".");
      sub = labels.slice(0, -2).join(".");
    }

    let parentArr = top;
    let id = domain;
    const domainNode = ensure(id, domain, parentArr);
    parentArr = domainNode.children ?? [];

    if (sub) {
      id += `::${sub}`;
      const subNode = ensure(id, sub, parentArr);
      parentArr = subNode.children ?? [];
    }

    for (const seg of segs) {
      id += `/${seg}`;
      const segNode = ensure(id, seg, parentArr);
      parentArr = segNode.children ?? [];
    }

    const leafId = `${id}#${r.method}`;
    if (!nodes[leafId]) {
      const leaf: CollectionNode & { _meta?: string; _recent?: boolean; _count?: number } = {
        id: leafId,
        name: r.method,
        type: "request",
        method: r.method as CollectionNode["method"],
        url: r.url,
        request: r.request,
      };
      leaf._meta = r.meta;
      leaf._recent = r.recent;
      parentArr.push(leaf);
      nodes[leafId] = leaf;
    }
  }

  const countNode = (n: CollectionNode & { _count?: number }): number => {
    if (n.type === "request") return 1;
    let c = 0;
    for (const ch of n.children ?? []) c += countNode(ch as CollectionNode & { _count?: number });
    n._count = c;
    return c;
  };
  for (const t of top) countNode(t);

  return top;
}

/* ── Render flat auto-organized tree ── */
function AutoTree({
  nodes,
  depth,
  onSelect,
  onDelete,
}: {
  nodes: CollectionNode[];
  depth: number;
  onSelect: (req: RequestConfig) => void;
  onDelete?: (node: CollectionNode) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <>
      {nodes.map((n) => {
        if (n.type === "request") {
          return (
            <TreeRow
              key={n.id}
              depth={depth}
              isFolder={false}
              label={n.method ?? ""}
              method={n.method}
              meta={(n as InternalNode)._meta}
              onClick={() => n.request && onSelect(n.request)}
              onDelete={onDelete ? () => onDelete(n) : undefined}
            />
          );
        }
        const expanded = !collapsed[n.id];
        return (
          <div key={n.id}>
            <TreeRow
              depth={depth}
              isFolder
              label={n.name}
              expanded={expanded}
              iconColor={depth === 0 ? "var(--accent)" : "var(--text-secondary)"}
              showCount={depth === 0}
              count={(n as InternalNode)._count}
              onClick={() => setCollapsed((c) => ({ ...c, [n.id]: !c[n.id] }))}
            />
            {expanded && (
              <AutoTree
                nodes={n.children ?? []}
                depth={depth + 1}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            )}
          </div>
        );
      })}
    </>
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
      ? "#4ADE80"
      : sc >= 400
        ? "#F87171"
        : sc >= 300
          ? "#60A5FA"
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
        borderRadius: 6,
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
          fontSize: 12.5,
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
            fontSize: 10.5,
            color: statusColor,
            marginLeft: 6,
            flexShrink: 0,
          }}
        >
          {sc}
        </span>
      )}
      <span
        style={{ fontSize: 10.5, color: "var(--text-secondary)", flexShrink: 0, marginLeft: 4 }}
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
            borderRadius: 3,
            color: "var(--text-secondary)",
            marginLeft: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
          className="hover:text-[#F87171]"
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

/* ── Main Sidebar ── */
interface SidebarProps {
  onImportClick: () => void;
}

export function Sidebar({ onImportClick }: SidebarProps) {
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const tabs = useTabStore((s) => s.tabs);

  const history = useHistoryStore((s) => s.history);
  const drafts = useHistoryStore((s) => s.drafts);
  const removeHistory = useHistoryStore((s) => s.removeHistory);
  const removeDraft = useHistoryStore((s) => s.removeDraft);

  const collections = useCollectionStore((s) => s.collections);
  const addCollection = useCollectionStore((s) => s.addCollection);
  const deleteCollection = useCollectionStore((s) => s.deleteCollection);
  const [activeTab, setActiveTabState] = useState<SidebarTab>("history");
  const [search, setSearch] = useState("");
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [newCollInput, setNewCollInput] = useState("");
  const [showNewColl, setShowNewColl] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadRequest = (req: RequestConfig) => {
    if (tabs.length === 1 && !tabs[0].request.url) {
      updateTabRequest(tabs[0].id, req);
      setActiveTab(tabs[0].id);
    } else {
      const id = addTab();
      updateTabRequest(id, req);
      setActiveTab(id);
    }
  };

  const handleNewRequest = () => {
    const id = addTab();
    setActiveTab(id);
  };

  const filter = useCallback(
    (text: string) => !search || text.toLowerCase().includes(search.toLowerCase()),
    [search],
  );

  /* Draft tree */
  const draftTree = useMemo(() => {
    const reqs = drafts
      .filter((d) => filter(d.name || d.url || ""))
      .map((d, i) => ({
        method: d.method,
        url: d.url,
        meta: String(i),
        request: d,
      }));
    return buildUrlTree(reqs);
  }, [drafts, filter]);

  /* Grouped history */
  const groupedHistory = useMemo(() => {
    const buckets: Record<string, HistoryItem[]> = {};
    const order = ["Today", "Yesterday", "This Week", "Last Week", "Older"];
    for (const item of history) {
      if (!filter(item.url)) continue;
      const b = getDateBucket(item.timestamp);
      if (!buckets[b]) buckets[b] = [];
      buckets[b].push(item);
    }
    for (const k of Object.keys(buckets)) buckets[k].sort((a, b) => b.timestamp - a.timestamp);
    return { buckets, order: order.filter((b) => buckets[b]?.length) };
  }, [history, filter]);

  /* Draft id → index map for deletion */
  const draftIdxByUrl = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      map.set(`${d.method}:${d.url}`, i);
    }
    return map;
  }, [drafts]);

  return (
    <div
      style={{
        flexShrink: 0,
        width: 270,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        minHeight: 0,
      }}
    >
      {/* New Request + Import */}
      <div style={{ flexShrink: 0, display: "flex", gap: 8, padding: "12px 10px 6px" }}>
        <Button
          variant="elevated"
          size="sm"
          onClick={handleNewRequest}
          style={{ flex: 1, justifyContent: "center", fontSize: 12.5, fontWeight: 600 }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Request
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onImportClick}
          title="Import cURL"
          style={{ paddingLeft: 10, paddingRight: 10, fontSize: 12.5 }}
        >
          <Upload size={14} />
          Import
        </Button>
      </div>

      {/* Sidebar tabs */}
      <div style={{ flexShrink: 0, display: "flex", padding: "8px 8px 0", gap: 2 }}>
        {(["history", "draft", "collections"] as SidebarTab[]).map((t) => (
          <Tab
            key={t}
            variant="sidebar"
            active={activeTab === t}
            onClick={() => setActiveTabState(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Tab>
        ))}
      </div>

      {/* Search */}
      <div style={{ flexShrink: 0, padding: "8px 10px" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            height: 34,
            background: "var(--bg-input)",
            border: `1px solid ${searchFocused ? "var(--border-focus)" : "var(--border)"}`,
            borderRadius: 6,
            transition: "border-color 0.1s",
          }}
        >
          <Search
            size={13}
            style={{ color: "var(--text-secondary)", flexShrink: 0, marginLeft: 10 }}
          />
          <input
            ref={searchRef}
            data-sidebar-search
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search…"
            style={{
              flex: 1,
              height: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: 12.5,
              padding: "0 8px",
              /* leave room for kbd or clear btn on the right */
              paddingRight: 34,
            }}
          />
          {/* Clear button — shown when typing */}
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                background: "none",
                border: "none",
                padding: 2,
              }}
            >
              <X size={12} />
            </button>
          )}
          {/* ⌘F hint — shown only when idle */}
          {!(searchFocused || search) && (
            <kbd
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-placeholder)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "1px 5px",
                pointerEvents: "none",
                lineHeight: 1.6,
              }}
            >
              ⌘F
            </kbd>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "2px 0 14px" }}>
        {/* ── HISTORY ── */}
        {activeTab === "history" &&
          (groupedHistory.order.length === 0 ? (
            <EmptyState
              icon="📭"
              label={search ? "No matching history" : "No history yet"}
              sub="Send a request to see it here"
            />
          ) : (
            groupedHistory.order.map((bucket) => (
              <div key={bucket}>
                <SectionHeader label={bucket} />
                {groupedHistory.buckets[bucket].map((item) => (
                  <HistoryRow
                    key={item.timestamp}
                    item={item}
                    onLoad={() => loadRequest(item.request)}
                    onDelete={() => removeHistory(history.indexOf(item))}
                  />
                ))}
              </div>
            ))
          ))}

        {/* ── DRAFT ── */}
        {activeTab === "draft" &&
          (draftTree.length === 0 ? (
            <EmptyState
              icon="🌱"
              label={search ? "No matching drafts" : "No drafts yet"}
              sub="Drafts appear automatically after you send a request"
            />
          ) : (
            <AutoTree
              nodes={draftTree}
              depth={0}
              onSelect={loadRequest}
              onDelete={(node) => {
                if (node.type === "request" && node.request) {
                  const key = `${node.request.method}:${node.request.url}`;
                  const idx = draftIdxByUrl.get(key);
                  if (idx !== undefined) removeDraft(idx);
                }
              }}
            />
          ))}

        {/* ── COLLECTIONS ── */}
        {activeTab === "collections" &&
          (collections.length === 0 && !showNewColl ? (
            <EmptyState
              icon="📁"
              label="No collections yet"
              action={{ label: "+ Create Collection", onClick: () => setShowNewColl(true) }}
            />
          ) : (
            <>
              {collections
                .filter((c) => c.id)
                .map((collection) => {
                  const id = collection.id as string;
                  const isExpanded = expandedCollections.has(id);
                  return (
                    <div key={id}>
                      {/* Collection header */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCollections((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          })
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          height: 28,
                          borderRadius: 6,
                          cursor: "pointer",
                          padding: "0 10px 0 8px",
                          margin: "0 4px",
                          transition: "background 0.1s",
                          width: "100%",
                          border: "none",
                          background: "none",
                          fontFamily: "inherit",
                          textAlign: "left",
                        }}
                        className="hover:bg-[var(--bg-elevated)]"
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexShrink: 0,
                            width: 16,
                            color: "var(--text-secondary)",
                            transform: isExpanded ? "rotate(90deg)" : "none",
                            transition: "transform 120ms ease",
                          }}
                        >
                          <ChevronRight size={12} strokeWidth={2.6} />
                        </span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0, marginRight: 7 }}
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontFamily: "var(--font-mono)",
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {collection.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: 20,
                            padding: "0 7px",
                            marginLeft: 8,
                          }}
                        >
                          {collection.root.length}
                        </span>
                        <button
                          type="button"
                          aria-label="Delete collection"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCollection(id);
                          }}
                          style={{
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 16,
                            height: 16,
                            borderRadius: 3,
                            color: "var(--text-secondary)",
                            marginLeft: 6,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          className="hover:text-[#F87171]"
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
                      </button>

                      {isExpanded &&
                        collection.root.map((node) => (
                          <CollectionTreeNode
                            key={node.id}
                            node={node}
                            depth={1}
                            onSelect={loadRequest}
                            collectionId={collection.id}
                          />
                        ))}
                    </div>
                  );
                })}

              {/* New collection input */}
              {showNewColl ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 10px 0",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      height: 34,
                      padding: "0 10px",
                      background: "var(--bg-input)",
                      border: "1px solid var(--border)",
                      borderRadius: 7,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <input
                      value={newCollInput}
                      onChange={(e) => setNewCollInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCollInput.trim()) {
                          addCollection(newCollInput.trim()).then(() => {});
                          setNewCollInput("");
                          setShowNewColl(false);
                        }
                        if (e.key === "Escape") {
                          setShowNewColl(false);
                          setNewCollInput("");
                        }
                      }}
                      placeholder="Collection name…"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text-primary)",
                        fontFamily: "inherit",
                        fontSize: 13,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      padding: "7px 4px 0",
                      lineHeight: 1.5,
                    }}
                  >
                    Press{" "}
                    <kbd
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        padding: "0 5px",
                      }}
                    >
                      Enter
                    </kbd>{" "}
                    to create
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewColl(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    margin: "10px 12px 0",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    fontFamily: "inherit",
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    padding: 0,
                  }}
                  className="hover:text-[var(--accent)]"
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
                    focusable="false"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Collection
                </button>
              )}
            </>
          ))}
      </div>

      {/* Status bar */}
      <div
        style={{
          flexShrink: 0,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
          {history.length} requests · {drafts.length} drafts
        </span>
        <kbd
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-placeholder)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "0 5px",
          }}
        >
          ?
        </kbd>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  label,
  sub,
  action,
}: {
  icon: string;
  label: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        textAlign: "center",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 500 }}>
        {label}
      </span>
      {sub && (
        <span style={{ fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {sub}
        </span>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            marginTop: 6,
            background: "transparent",
            border: "none",
            color: "var(--accent)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 500,
            padding: 0,
          }}
          className="hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
