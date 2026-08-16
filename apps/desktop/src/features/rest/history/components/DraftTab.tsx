import { EmptyState } from "@pigeon/ui";
import { useMemo, useState } from "react";
import type { RequestConfig } from "@/shared/types";
import { SidebarLoadingState } from "@/shared/ui/SidebarLoadingState";
import { TreeRow } from "@/shared/ui/TreeRow";
import {
  FolderConfigModal,
  type FolderConfigModalState,
} from "../../collections/components/FolderConfigModal";
import { resolveInheritedRequest } from "../../collections/lib/inheritance";
import {
  buildUrlTree,
  collapseChains,
  countNode,
  findAncestors,
  type InternalNode,
  mergeCollectionRoots,
  relabelLeaves,
} from "../../collections/lib/tree";
import type { CollectionNode, FolderConfig } from "../../collections/types";
import { useHistoryStore } from "../store";

function hasFolderConfig(config: FolderConfig | undefined): boolean {
  return !!config && (!!config.headers?.length || (!!config.auth && config.auth.type !== "none"));
}

/** Overlay persisted draft-folder config onto a freshly-built tree, in place —
 *  the tree is already rebuilt fresh every render (see `useMemo` below), so
 *  mutating here is no different from the existing `countNode` pass. */
function attachFolderConfigs(nodes: CollectionNode[], configs: Record<string, FolderConfig>): void {
  for (const n of nodes) {
    if (n.type !== "folder") continue;
    if (configs[n.id]) n.folderConfig = configs[n.id];
    attachFolderConfigs(n.children ?? [], configs);
  }
}

function matchesSearch(text: string, search: string): boolean {
  return !search || text.toLowerCase().includes(search.toLowerCase());
}

/* ── Render auto-organized tree ──
   Controlled expand map lives here so it survives tab switches and feeds
   expand-all/collapse-all. Folders start collapsed; the map only stores
   explicit expand overrides. */
function AutoTree({
  nodes,
  depth,
  expanded,
  onToggle,
  onSelect,
  onDelete,
  onEditFolderConfig,
}: {
  nodes: CollectionNode[];
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string, next: boolean) => void;
  onSelect: (req: RequestConfig, nodeId: string) => void;
  onDelete?: (node: CollectionNode) => void;
  onEditFolderConfig: (node: CollectionNode) => void;
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
              onClick={() => n.request && onSelect(n.request, n.id)}
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
              showCount={depth === 0}
              count={count}
              hasConfig={hasFolderConfig(n.folderConfig)}
              onClick={() => onToggle(n.id, !isOpen)}
              onEditConfig={() => onEditFolderConfig(n)}
            />
            {isOpen && (
              <AutoTree
                nodes={n.children ?? []}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
                onDelete={onDelete}
                onEditFolderConfig={onEditFolderConfig}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

/* ── Draft tab content ── */
export function DraftTab({
  search,
  onSelect,
}: {
  search: string;
  onSelect: (req: RequestConfig) => void;
}) {
  const drafts = useHistoryStore((s) => s.drafts);
  const loaded = useHistoryStore((s) => s.loaded);
  const removeDraft = useHistoryStore((s) => s.removeDraft);
  const draftFolderConfigs = useHistoryStore((s) => s.draftFolderConfigs);
  const setDraftFolderConfig = useHistoryStore((s) => s.setDraftFolderConfig);
  const [draftExpanded, setDraftExpanded] = useState<Record<string, boolean>>({});
  const [folderConfigModal, setFolderConfigModal] = useState<FolderConfigModalState | null>(null);
  const toggleDraft = (id: string, next: boolean) =>
    setDraftExpanded((e) => ({ ...e, [id]: next }));

  /* Draft tree — path-compressed host/path grouping */
  const draft = useMemo(() => {
    const reqs = drafts
      .filter((d) => matchesSearch(d.name || d.url || "", search))
      .map((d) => ({ method: d.method, url: d.url, request: d }));
    let tree = mergeCollectionRoots(buildUrlTree(reqs));
    relabelLeaves(tree);
    tree = collapseChains(tree, true);
    for (const t of tree) countNode(t);
    attachFolderConfigs(tree, draftFolderConfigs);
    return { tree, total: reqs.length };
  }, [drafts, search, draftFolderConfigs]);

  /* Draft id → index map for deletion */
  const draftIdxByUrl = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      map.set(`${d.method}:${d.url}`, i);
    }
    return map;
  }, [drafts]);

  if (!loaded) {
    return <SidebarLoadingState label="Loading drafts…" />;
  }

  if (draft.total === 0) {
    return (
      <EmptyState
        icon="🌱"
        label={search ? "No matching drafts" : "No drafts yet"}
        sub="Drafts appear automatically after you send a request"
      />
    );
  }

  return (
    <>
      <AutoTree
        nodes={draft.tree}
        depth={0}
        expanded={draftExpanded}
        onToggle={toggleDraft}
        onSelect={(req, nodeId) =>
          onSelect(resolveInheritedRequest(findAncestors(draft.tree, nodeId), req))
        }
        onDelete={(node) => {
          if (node.type === "request" && node.request) {
            const key = `${node.request.method}:${node.request.url}`;
            const idx = draftIdxByUrl.get(key);
            if (idx !== undefined) removeDraft(idx);
          }
        }}
        onEditFolderConfig={(node) =>
          setFolderConfigModal({
            folderName: node.name,
            config: node.folderConfig ?? {},
            onSubmit: (config) => setDraftFolderConfig(node.id, config),
          })
        }
      />
      {folderConfigModal && (
        <FolderConfigModal state={folderConfigModal} onClose={() => setFolderConfigModal(null)} />
      )}
    </>
  );
}
