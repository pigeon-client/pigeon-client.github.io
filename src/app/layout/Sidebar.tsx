import {
  ChevronRight,
  FilePlus,
  FolderPlus,
  PanelLeftClose,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CollectionNode } from "@/features/collections";
import { useCollectionStore } from "@/features/collections";
import type { HistoryItem } from "@/features/history";
import { useHistoryStore } from "@/features/history";
import { useTabStore } from "@/features/request-builder";
import { parseUrl } from "@/shared/lib/url";
import type { RequestConfig } from "@/shared/types";
import { METHOD_COLORS, MethodBadge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Modal, ModalFooter, ModalHeader } from "@/shared/ui/Modal";
import { Tab } from "@/shared/ui/tabs-shim";

type SidebarTab = "history" | "draft" | "collections";

interface NameModalState {
  title: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  initialValue?: string;
  onSubmit: (name: string) => void;
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
  onRename?: () => void;
  onAddFolder?: () => void;
  onAddRequest?: () => void;
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
  onRename,
  onAddFolder,
  onAddRequest,
}: TreeRowProps) {
  const [hovered, setHovered] = useState(false);
  const mc = method ? (METHOD_COLORS[method] ?? METHOD_COLORS.GET) : undefined;

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
        borderRadius: "var(--radius)",
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
            stroke={iconColor ?? "var(--primary)"}
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
              fontSize: "var(--text-xs)",
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
                fontSize: "var(--text-2xs)",
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0 7px",
                marginLeft: 8,
                flexShrink: 0,
              }}
            >
              {count}
            </span>
          )}
          {hovered && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: 4 }}>
              {onAddRequest && (
                <RowIconButton label="Add current request" onClick={onAddRequest}>
                  <FilePlus size={12} />
                </RowIconButton>
              )}
              {onAddFolder && (
                <RowIconButton label="Add folder" onClick={onAddFolder}>
                  <FolderPlus size={12} />
                </RowIconButton>
              )}
              {onRename && (
                <RowIconButton label="Rename" onClick={onRename}>
                  <Pencil size={11} />
                </RowIconButton>
              )}
              {onDelete && (
                <RowIconButton label="Delete" danger onClick={onDelete}>
                  <Trash2 size={11} />
                </RowIconButton>
              )}
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
                  fontSize: "var(--text-xs)",
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
                  fontSize: "var(--text-xs)",
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
                  fontSize: "var(--text-xs)",
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
              fontSize: "var(--text-2xs)",
              color: "var(--text-secondary)",
              paddingLeft: 8,
              whiteSpace: "nowrap",
            }}
          >
            {meta}
          </span>
          {onRename && hovered && (
            <RowIconButton label="Rename" onClick={onRename}>
              <Pencil size={11} />
            </RowIconButton>
          )}
          {onDelete && hovered && (
            <RowIconButton label="Delete" danger onClick={onDelete}>
              <Trash2 size={11} />
            </RowIconButton>
          )}
        </>
      )}
    </div>
  );
}

function RowIconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: "var(--radius)",
        color: "var(--text-secondary)",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
      className={danger ? "hover:text-status-5xx" : "hover:text-primary"}
    >
      {children}
    </button>
  );
}

function NameModal({ state, onClose }: { state: NameModalState; onClose: () => void }) {
  const [draft, setDraft] = useState(state.initialValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    state.onSubmit(trimmed);
    onClose();
  };

  return (
    <Modal onClose={onClose} width={420} animate={state.title !== "Create Collection"}>
      <ModalHeader title={state.title} onClose={onClose} />
      <div className="px-5 py-5">
        <label
          htmlFor="collection-name-modal-input"
          className="mb-2 block text-2xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {state.label}
        </label>
        <input
          id="collection-name-modal-input"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onClose();
          }}
          placeholder={state.placeholder}
          className="h-9 w-full rounded border border-border bg-card px-3 font-mono text-xs text-foreground outline-none focus:border-primary"
        />
      </div>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={commit} disabled={!draft.trim()}>
          {state.confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/* ── Nested collection tree node ── */
function CollectionTreeNode({
  node,
  depth,
  onSelect,
  collectionId,
  activeRequest,
  onRenameNode,
  onAddFolder,
  onAddRequest,
}: {
  node: CollectionNode;
  depth: number;
  onSelect: (req: RequestConfig) => void;
  collectionId?: string;
  activeRequest?: RequestConfig | null;
  onRenameNode: (collectionId: string, node: CollectionNode) => void;
  onAddFolder: (collectionId: string, parentId: string | null) => void;
  onAddRequest: (collectionId: string, parentId: string | null, request: RequestConfig) => void;
}) {
  // Folders start collapsed by default.
  const [expanded, setExpanded] = useState(false);
  const removeNode = useCollectionStore((s) => s.removeNode);

  if (!collectionId) return null;

  if (node.type === "request") {
    return (
      <TreeRow
        depth={depth}
        isFolder={false}
        label={node.name}
        method={node.method}
        onClick={() => node.request && onSelect(node.request)}
        onRename={() => onRenameNode(collectionId, node)}
        onDelete={() => {
          if (confirm(`Delete "${node.name}" from this collection?`))
            removeNode(collectionId, node.id);
        }}
      />
    );
  }

  const handleAddFolder = () => {
    onAddFolder(collectionId, node.id);
    setExpanded(true);
  };
  const handleAddRequest = () => {
    if (!activeRequest?.url) return;
    onAddRequest(collectionId, node.id, activeRequest);
    setExpanded(true);
  };

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
        onAddRequest={activeRequest?.url ? handleAddRequest : undefined}
        onAddFolder={handleAddFolder}
        onRename={() => onRenameNode(collectionId, node)}
        onDelete={() => {
          if (confirm(`Delete folder "${node.name}" and its children?`)) {
            removeNode(collectionId, node.id);
          }
        }}
      />
      {expanded &&
        (node.children ?? []).map((child) => (
          <CollectionTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            collectionId={collectionId}
            activeRequest={activeRequest}
            onRenameNode={onRenameNode}
            onAddFolder={onAddFolder}
            onAddRequest={onAddRequest}
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

/* Recompute leaf counts onto folder `_count`. */
function countNode(n: CollectionNode & { _count?: number }): number {
  if (n.type === "request") return 1;
  let c = 0;
  for (const ch of n.children ?? []) c += countNode(ch as CollectionNode & { _count?: number });
  n._count = c;
  return c;
}

/* ── Build auto-organized tree from URL list ──
   One host folder, then path folders, leaf = endpoint (last path segment). */
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

    let host = "requests";
    let pathParts: string[] = [];
    try {
      const u = new URL(normalized);
      host = u.hostname || host;
      pathParts = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    } catch {
      const m = normalized.match(/^https?:\/\/([^/]+)/i);
      if (m) host = m[1];
    }

    // Folders = host + intermediate path segments. Leaf = final segment.
    const folderSegs = pathParts.slice(0, -1);
    const endpoint = pathParts.at(-1) ?? "/";

    let parentArr = top;
    let id = host;
    parentArr = (ensure(id, host, parentArr).children ?? []) as CollectionNode[];

    for (const seg of folderSegs) {
      id += `/${seg}`;
      parentArr = (ensure(id, seg, parentArr).children ?? []) as CollectionNode[];
    }

    const leafId = `${id}/${endpoint}#${r.method}`;
    if (!nodes[leafId]) {
      const leaf: CollectionNode & { _meta?: string; _recent?: boolean; _count?: number } = {
        id: leafId,
        name: endpoint,
        type: "request",
        method: r.method as CollectionNode["method"],
        url: r.url,
        request: r.request,
      };
      leaf._recent = r.recent;
      parentArr.push(leaf);
      nodes[leafId] = leaf;
    }
  }

  for (const t of top) countNode(t);
  return top;
}

/* ── Path compression: fold single-folder-child chains into one row ──
   `v1 › users › {leaves}` becomes `v1 / users`. The top level (host folders)
   is left alone so a host always reads as just its domain — path segments only
   compress beneath it. */
function collapseChains(nodes: CollectionNode[], isTop = false): CollectionNode[] {
  return nodes.map((n) => {
    if (n.type !== "folder") return n;
    if (isTop) {
      // Host stays its own row; compress only its descendants.
      return { ...n, children: collapseChains(n.children ?? []) };
    }
    let name = n.name;
    let cur = n;
    while ((cur.children?.length ?? 0) === 1 && cur.children?.[0].type === "folder") {
      const only = cur.children[0];
      name = `${name}/${only.name}`;
      cur = only;
    }
    return { ...cur, name, children: collapseChains(cur.children ?? []) };
  });
}

/* ── Group collection-root requests into their resource folder ──
   `/todos` (list) + `/todos/1` (item) → one `todos` folder holding both.
   When a folder and a sibling request share a name, the request moves inside
   the folder as its root. Runs deepest-first so nested roots group too. */
function mergeCollectionRoots(nodes: CollectionNode[]): CollectionNode[] {
  // Recurse into folders first.
  for (const n of nodes) {
    if (n.type === "folder") n.children = mergeCollectionRoots(n.children ?? []);
  }
  const folderByName = new Map<string, CollectionNode>();
  for (const n of nodes) if (n.type === "folder") folderByName.set(n.name, n);

  const out: CollectionNode[] = [];
  for (const n of nodes) {
    const folder = n.type === "request" ? folderByName.get(n.name) : undefined;
    if (folder) {
      folder.children = [{ ...n, name: "/" }, ...(folder.children ?? [])];
    } else {
      out.push(n);
    }
  }
  return out;
}

/* Label request leaves by their path relative to the parent folder: the
   collection root stays "/", every other leaf becomes "/<segment>". */
function relabelLeaves(nodes: CollectionNode[]): void {
  for (const n of nodes) {
    if (n.type === "request") {
      if (n.name !== "/") n.name = `/${n.name}`;
    } else {
      relabelLeaves(n.children ?? []);
    }
  }
}

function countRequests(nodes: CollectionNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "request") count += 1;
    else count += countRequests(node.children ?? []);
  }
  return count;
}

/* ── Render auto-organized tree ──
   Controlled expand map lives in Sidebar so it survives tab switches and
   feeds expand-all/collapse-all. Folders start collapsed; the map only stores
   explicit expand overrides. */
function AutoTree({
  nodes,
  depth,
  expanded,
  onToggle,
  onSelect,
  onDelete,
}: {
  nodes: CollectionNode[];
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string, next: boolean) => void;
  onSelect: (req: RequestConfig) => void;
  onDelete?: (node: CollectionNode) => void;
}) {
  return (
    <>
      {nodes.map((n) => {
        if (n.type === "request") {
          return (
            <TreeRow
              key={n.id}
              depth={depth}
              isFolder={false}
              label={n.name}
              method={n.method}
              onClick={() => n.request && onSelect(n.request)}
              onDelete={onDelete ? () => onDelete(n) : undefined}
            />
          );
        }
        const count = (n as InternalNode)._count ?? 0;
        const isOpen = expanded[n.id] ?? false;
        return (
          <div key={n.id}>
            <TreeRow
              depth={depth}
              isFolder
              label={n.name}
              expanded={isOpen}
              iconColor={depth === 0 ? "var(--primary)" : "var(--text-secondary)"}
              showCount={depth === 0}
              count={count}
              onClick={() => onToggle(n.id, !isOpen)}
            />
            {isOpen && (
              <AutoTree
                nodes={n.children ?? []}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
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

/* ── Main Sidebar ── */
interface SidebarProps {
  onImportClick: () => void;
  onCollapse: () => void;
  search: string;
}

export function Sidebar({ onImportClick, onCollapse, search }: SidebarProps) {
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const tabs = useTabStore((s) => s.tabs);

  const history = useHistoryStore((s) => s.history);
  const drafts = useHistoryStore((s) => s.drafts);
  const removeHistory = useHistoryStore((s) => s.removeHistory);
  const removeDraft = useHistoryStore((s) => s.removeDraft);

  const collections = useCollectionStore((s) => s.collections);
  const addCollection = useCollectionStore((s) => s.addCollection);
  const renameCollection = useCollectionStore((s) => s.renameCollection);
  const deleteCollection = useCollectionStore((s) => s.deleteCollection);
  const renameNode = useCollectionStore((s) => s.renameNode);
  const addFolder = useCollectionStore((s) => s.addFolder);
  const addRequest = useCollectionStore((s) => s.addRequest);
  const [activeTab, setActiveTabState] = useState<SidebarTab>("draft");
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [draftExpanded, setDraftExpanded] = useState<Record<string, boolean>>({});
  const [nameModal, setNameModal] = useState<NameModalState | null>(null);

  const toggleDraft = useCallback(
    (id: string, next: boolean) => setDraftExpanded((e) => ({ ...e, [id]: next })),
    [],
  );

  const activeRequest = useMemo(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    return tab?.request.url ? tab.request : null;
  }, [activeTabId, tabs]);

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
  const openCreateCollectionModal = () => {
    setNameModal({
      title: "Create Collection",
      label: "Collection Name",
      placeholder: "My API",
      confirmLabel: "Create",
      onSubmit: (name) => {
        addCollection(name)
          .then((id) => {
            if (id) setExpandedCollections((prev) => new Set(prev).add(id));
          })
          .catch((err) => alert(`Failed to create collection: ${String(err)}`));
      },
    });
  };
  const openRenameCollectionModal = (collectionId: string, name: string) => {
    setNameModal({
      title: "Rename Collection",
      label: "Collection Name",
      placeholder: "Collection name",
      confirmLabel: "Rename",
      initialValue: name,
      onSubmit: (nextName) => {
        renameCollection(collectionId, nextName).catch((err) =>
          alert(`Failed to rename collection: ${String(err)}`),
        );
      },
    });
  };
  const openAddFolderModal = (collectionId: string, parentId: string | null) => {
    setNameModal({
      title: "Create Folder",
      label: "Folder Name",
      placeholder: "Auth",
      confirmLabel: "Create",
      onSubmit: (name) => {
        addFolder(collectionId, parentId, name)
          .then((ok) => {
            if (ok) setExpandedCollections((prev) => new Set(prev).add(collectionId));
          })
          .catch((err) => alert(`Failed to create folder: ${String(err)}`));
      },
    });
  };
  const openAddRequestModal = (
    collectionId: string,
    parentId: string | null,
    request: RequestConfig,
  ) => {
    setNameModal({
      title: "Save Request",
      label: "Request Name",
      placeholder: request.name || request.url || "Untitled Request",
      confirmLabel: "Save",
      initialValue: request.name || request.url,
      onSubmit: (name) => {
        addRequest(collectionId, parentId, name, request)
          .then((ok) => {
            if (ok) setExpandedCollections((prev) => new Set(prev).add(collectionId));
          })
          .catch((err) => alert(`Failed to save request: ${String(err)}`));
      },
    });
  };
  const openRenameNodeModal = (collectionId: string, node: CollectionNode) => {
    setNameModal({
      title: node.type === "folder" ? "Rename Folder" : "Rename Request",
      label: node.type === "folder" ? "Folder Name" : "Request Name",
      placeholder: node.type === "folder" ? "Folder name" : "Request name",
      confirmLabel: "Rename",
      initialValue: node.name,
      onSubmit: (name) => {
        renameNode(collectionId, node.id, name).catch((err) =>
          alert(`Failed to rename item: ${String(err)}`),
        );
      },
    });
  };

  const filter = useCallback(
    (text: string) => !search || text.toLowerCase().includes(search.toLowerCase()),
    [search],
  );

  /* Recursive collection tree filter — keeps ancestors of matching nodes */
  const filterTree = useCallback(
    (nodes: CollectionNode[]): CollectionNode[] => {
      if (!search) return nodes;
      const out: CollectionNode[] = [];
      for (const n of nodes) {
        const selfMatch = filter(n.name) || (n.url ? filter(n.url) : false);
        const children = n.children ? filterTree(n.children) : [];
        if (selfMatch || children.length > 0) {
          out.push({ ...n, children: children.length > 0 ? children : n.children });
        }
      }
      return out;
    },
    [filter, search],
  );

  /* Collections filtered by search */
  const filteredCollections = useMemo(
    () =>
      collections
        .filter((c) => c.id)
        .filter((c) => !search || filter(c.name) || filterTree(c.root).length > 0)
        .map((c) => ({ ...c, root: search ? filterTree(c.root) : c.root })),
    [collections, search, filter, filterTree],
  );

  /* Draft tree — path-compressed host/path grouping */
  const draft = useMemo(() => {
    const reqs = drafts
      .filter((d) => filter(d.name || d.url || ""))
      .map((d) => ({ method: d.method, url: d.url, request: d }));
    let tree = mergeCollectionRoots(buildUrlTree(reqs));
    relabelLeaves(tree);
    tree = collapseChains(tree, true);
    for (const t of tree) countNode(t);
    return { tree, total: reqs.length };
  }, [drafts, filter]);

  /* Grouped history */
  const groupedHistory = useMemo(() => {
    const buckets: Record<string, HistoryItem[]> = {};
    const order = ["Today", "Yesterday", "This Week", "Last Week", "Older"];
    for (const item of history) {
      if (!filter(item.name || item.url)) continue;
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
    <aside className="flex w-full min-w-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground min-h-0">
      {/* New Request + Import */}
      <div className="flex flex-shrink-0 gap-2 px-2.5 pt-3 pb-1.5">
        <Button
          variant="default"
          size="sm"
          data-testid="sidebar-new-request"
          onClick={handleNewRequest}
          className="flex-1 justify-center font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          New Request
        </Button>
        <Button
          variant="outline"
          size="sm"
          data-testid="sidebar-import"
          onClick={onImportClick}
          title="Import cURL"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Sidebar tabs — 3 equal columns */}
      <div className="grid grid-cols-3 gap-1 px-2 pt-1">
        {(["history", "draft", "collections"] as SidebarTab[]).map((t) => (
          <Tab
            key={t}
            variant="sidebar"
            testId={`sidebar-tab-${t}`}
            active={activeTab === t}
            onClick={() => setActiveTabState(t)}
          >
            <span className="cursor-pointer">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
          </Tab>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-0 py-0.5 pb-3.5">
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
          (draft.total === 0 ? (
            <EmptyState
              icon="🌱"
              label={search ? "No matching drafts" : "No drafts yet"}
              sub="Drafts appear automatically after you send a request"
            />
          ) : (
            <AutoTree
              nodes={draft.tree}
              depth={0}
              expanded={draftExpanded}
              onToggle={toggleDraft}
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
          (collections.length === 0 && !search ? (
            <EmptyState
              icon="📁"
              label="No collections yet"
              action={{ label: "+ Create Collection", onClick: openCreateCollectionModal }}
            />
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={openCreateCollectionModal}
                className="mx-2 mb-2 w-[calc(100%-16px)] justify-center gap-2 border-dashed"
              >
                <Plus className="h-3.5 w-3.5" />
                New Collection
              </Button>
              {filteredCollections.length === 0 && (
                <EmptyState
                  icon="🔍"
                  label={search ? "No matches" : "No collections yet"}
                  sub={search ? "Try a different search term" : undefined}
                />
              )}
              {filteredCollections.map((collection) => {
                const id = collection.id as string;
                const isExpanded = expandedCollections.has(id);
                return (
                  <div key={id}>
                    <TreeRow
                      depth={0}
                      isFolder
                      label={collection.name}
                      expanded={isExpanded}
                      showCount
                      count={countRequests(collection.root)}
                      onClick={() =>
                        setExpandedCollections((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        })
                      }
                      onAddRequest={
                        activeRequest?.url
                          ? () => openAddRequestModal(id, null, activeRequest)
                          : undefined
                      }
                      onAddFolder={() => openAddFolderModal(id, null)}
                      onRename={() => openRenameCollectionModal(id, collection.name)}
                      onDelete={() => {
                        if (confirm(`Delete collection "${collection.name}"?`)) {
                          deleteCollection(id);
                        }
                      }}
                    />

                    {isExpanded &&
                      collection.root.map((node) => (
                        <CollectionTreeNode
                          key={node.id}
                          node={node}
                          depth={1}
                          onSelect={loadRequest}
                          collectionId={collection.id}
                          activeRequest={activeRequest}
                          onRenameNode={openRenameNodeModal}
                          onAddFolder={openAddFolderModal}
                          onAddRequest={openAddRequestModal}
                        />
                      ))}
                  </div>
                );
              })}
            </>
          ))}
      </div>

      {/* Status bar */}
      <div className="flex h-6 flex-shrink-0 items-center justify-between border-t border-border px-2">
        <span className="pl-1 text-2xs text-muted-foreground">
          {history.length} requests · {drafts.length} drafts
        </span>
        <button
          type="button"
          data-testid="sidebar-collapse"
          onClick={onCollapse}
          title="Hide sidebar"
          aria-label="Hide sidebar"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {nameModal && <NameModal state={nameModal} onClose={() => setNameModal(null)} />}
    </aside>
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
      <span style={{ fontSize: "var(--text-2xl)" }}>{icon}</span>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 500 }}>
        {label}
      </span>
      {sub && (
        <span
          style={{ fontSize: "var(--text-2xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}
        >
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
            color: "var(--primary)",
            fontSize: "var(--text-xs)",
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
