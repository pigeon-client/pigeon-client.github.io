import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Button,
  ConfirmModal,
  type ConfirmModalState,
  EmptyState,
  METHOD_COLORS,
} from "@pigeon/ui";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RequestConfig } from "@/shared/types";
import { SidebarLoadingState } from "@/shared/ui/SidebarLoadingState";
import { TreeRow } from "@/shared/ui/TreeRow";
import { useTabStore } from "../../request-builder/store";
import { resolveInheritedRequest } from "../lib/inheritance";
import { countRequests, findAncestors } from "../lib/tree";
import { findNode, useCollectionStore } from "../store";
import type { CollectionNode, FolderConfig } from "../types";
import { FolderConfigModal, type FolderConfigModalState } from "./FolderConfigModal";
import { NameModal, type NameModalState } from "./NameModal";

/** Floating preview that follows the pointer while dragging a request. */
function RequestDragPreview({ name, method }: { name: string; method?: string }) {
  const mc = method ? (METHOD_COLORS[method] ?? METHOD_COLORS.GET) : undefined;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        height: 28,
        minWidth: 160,
        maxWidth: 260,
        padding: "0 10px",
        borderRadius: "var(--radius)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 24px color-mix(in oklch, var(--text-primary) 18%, transparent)",
        cursor: "grabbing",
        pointerEvents: "none",
      }}
    >
      {method && mc ? (
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
      ) : null}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--text-primary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
      </span>
    </div>
  );
}

/** Draggable request id: `drag:<collectionId>:<nodeId>` */
function dragId(collectionId: string, nodeId: string): string {
  return `drag:${collectionId}:${nodeId}`;
}

/** Droppable folder/root id: `drop:<collectionId>:<folderId|root>` */
function dropId(collectionId: string, parentId: string | null): string {
  return `drop:${collectionId}:${parentId ?? "root"}`;
}

function parseDragId(id: string): { collectionId: string; nodeId: string } | null {
  if (!id.startsWith("drag:")) return null;
  const rest = id.slice("drag:".length);
  const sep = rest.indexOf(":");
  if (sep <= 0) return null;
  const collectionId = rest.slice(0, sep);
  const nodeId = rest.slice(sep + 1);
  if (!(collectionId && nodeId)) return null;
  return { collectionId, nodeId };
}

function parseDropId(id: string): { collectionId: string; parentId: string | null } | null {
  if (!id.startsWith("drop:")) return null;
  const rest = id.slice("drop:".length);
  const sep = rest.indexOf(":");
  if (sep <= 0) return null;
  const collectionId = rest.slice(0, sep);
  const parentKey = rest.slice(sep + 1);
  if (!(collectionId && parentKey)) return null;
  return { collectionId, parentId: parentKey === "root" ? null : parentKey };
}

function hasFolderConfig(config: FolderConfig | undefined): boolean {
  return !!config && (!!config.headers?.length || (!!config.auth && config.auth.type !== "none"));
}

function matchesSearch(text: string, search: string): boolean {
  return !search || text.toLowerCase().includes(search.toLowerCase());
}

function DraggableRequestRow({
  node,
  depth,
  collectionId,
  onSelect,
  onRename,
  onDelete,
}: {
  node: CollectionNode;
  depth: number;
  collectionId: string;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId(collectionId, node.id),
    data: { collectionId, nodeId: node.id, type: "request" as const },
  });

  return (
    <TreeRow
      depth={depth}
      isFolder={false}
      label={node.name}
      method={node.method}
      grab
      isDragging={isDragging}
      setRowRef={setNodeRef}
      dragProps={{ ...attributes, ...listeners }}
      onClick={onSelect}
      onRename={onRename}
      onDelete={onDelete}
    />
  );
}

function DroppableFolderRow({
  node,
  depth,
  collectionId,
  expanded,
  dropActive,
  onToggle,
  onExpand,
  onAddRequest,
  onAddFolder,
  onEditConfig,
  onRename,
  onDelete,
}: {
  node: CollectionNode;
  depth: number;
  collectionId: string;
  expanded: boolean;
  dropActive: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onAddRequest?: () => void;
  onAddFolder: () => void;
  onEditConfig: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId(collectionId, node.id),
    data: { collectionId, parentId: node.id, type: "folder" as const },
  });

  // Open the folder while hovering a drag so nested targets are reachable.
  useEffect(() => {
    if (isOver || dropActive) onExpand();
  }, [isOver, dropActive, onExpand]);

  return (
    <TreeRow
      depth={depth}
      isFolder
      label={node.name}
      expanded={expanded}
      showCount={depth === 0}
      count={(node.children ?? []).length}
      hasConfig={hasFolderConfig(node.folderConfig)}
      dropActive={dropActive || isOver}
      setRowRef={setNodeRef}
      onClick={onToggle}
      onAddRequest={onAddRequest}
      onAddFolder={onAddFolder}
      onEditConfig={onEditConfig}
      onRename={onRename}
      onDelete={onDelete}
    />
  );
}

function DroppableCollectionRow({
  collectionId,
  name,
  expanded,
  requestCount,
  dropActive,
  hasConfig,
  onToggle,
  onExpand,
  onAddRequest,
  onAddFolder,
  onEditConfig,
  onRename,
  onDelete,
}: {
  collectionId: string;
  name: string;
  expanded: boolean;
  requestCount: number;
  dropActive: boolean;
  hasConfig: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onAddRequest?: () => void;
  onAddFolder: () => void;
  onEditConfig: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId(collectionId, null),
    data: { collectionId, parentId: null, type: "root" as const },
  });

  useEffect(() => {
    if (isOver || dropActive) onExpand();
  }, [isOver, dropActive, onExpand]);

  return (
    <TreeRow
      depth={0}
      isFolder
      label={name}
      expanded={expanded}
      showCount
      count={requestCount}
      hasConfig={hasConfig}
      dropActive={dropActive || isOver}
      setRowRef={setNodeRef}
      onClick={onToggle}
      onAddRequest={onAddRequest}
      onAddFolder={onAddFolder}
      onEditConfig={onEditConfig}
      onRename={onRename}
      onDelete={onDelete}
    />
  );
}

/* ── Nested collection tree node ── */
function CollectionTreeNode({
  node,
  depth,
  onSelect,
  collectionId,
  activeRequest,
  dropTargetKey,
  onRenameNode,
  onAddFolder,
  onAddRequest,
  onDeleteNode,
  onEditFolderConfig,
}: {
  node: CollectionNode;
  depth: number;
  onSelect: (req: RequestConfig, nodeId: string) => void;
  collectionId?: string;
  activeRequest?: RequestConfig | null;
  dropTargetKey: string | null;
  onRenameNode: (collectionId: string, node: CollectionNode) => void;
  onAddFolder: (collectionId: string, parentId: string | null) => void;
  onAddRequest: (collectionId: string, parentId: string | null, request: RequestConfig) => void;
  onDeleteNode: (collectionId: string, node: CollectionNode) => void;
  onEditFolderConfig: (collectionId: string, node: CollectionNode) => void;
}) {
  // Folders start collapsed by default.
  const [expanded, setExpanded] = useState(false);
  const expandFolder = useCallback(() => setExpanded(true), []);

  if (!collectionId) return null;

  if (node.type === "request") {
    return (
      <DraggableRequestRow
        node={node}
        depth={depth}
        collectionId={collectionId}
        onSelect={() => node.request && onSelect(node.request, node.id)}
        onRename={() => onRenameNode(collectionId, node)}
        onDelete={() => onDeleteNode(collectionId, node)}
      />
    );
  }

  const folderDropKey = dropId(collectionId, node.id);
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
      <DroppableFolderRow
        node={node}
        depth={depth}
        collectionId={collectionId}
        expanded={expanded}
        dropActive={dropTargetKey === folderDropKey}
        onToggle={() => setExpanded((e) => !e)}
        onExpand={expandFolder}
        onAddRequest={activeRequest?.url ? handleAddRequest : undefined}
        onAddFolder={handleAddFolder}
        onEditConfig={() => onEditFolderConfig(collectionId, node)}
        onRename={() => onRenameNode(collectionId, node)}
        onDelete={() => onDeleteNode(collectionId, node)}
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
            dropTargetKey={dropTargetKey}
            onRenameNode={onRenameNode}
            onAddFolder={onAddFolder}
            onAddRequest={onAddRequest}
            onDeleteNode={onDeleteNode}
            onEditFolderConfig={onEditFolderConfig}
          />
        ))}
    </>
  );
}

/* ── Collections tab content ── */
export function CollectionsTab({
  search,
  activeRequest,
  onSelect,
}: {
  search: string;
  activeRequest: RequestConfig | null;
  onSelect: (req: RequestConfig, origin?: { collectionId: string; nodeId: string }) => void;
}) {
  const collections = useCollectionStore((s) => s.collections);
  const loaded = useCollectionStore((s) => s.loaded);
  const addCollection = useCollectionStore((s) => s.addCollection);
  const renameCollection = useCollectionStore((s) => s.renameCollection);
  const deleteCollection = useCollectionStore((s) => s.deleteCollection);
  const renameNode = useCollectionStore((s) => s.renameNode);
  const removeNode = useCollectionStore((s) => s.removeNode);
  const addFolder = useCollectionStore((s) => s.addFolder);
  const addRequest = useCollectionStore((s) => s.addRequest);
  const setFolderConfig = useCollectionStore((s) => s.setFolderConfig);
  const setCollectionConfig = useCollectionStore((s) => s.setCollectionConfig);
  const moveNode = useCollectionStore((s) => s.moveNode);

  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [nameModal, setNameModal] = useState<NameModalState | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [folderConfigModal, setFolderConfigModal] = useState<FolderConfigModalState | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<{
    collectionId: string;
    name: string;
    method?: string;
  } | null>(null);

  // Distance threshold so a click still opens/selects; drag starts after a small move.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  /* Merge ancestor folder headers/auth into the request before opening it. */
  const selectWithInheritance = useCallback(
    (collectionId: string, req: RequestConfig, nodeId: string) => {
      const collection = collections.find((c) => c.id === collectionId);
      const ancestors = collection ? findAncestors(collection.root, nodeId) : [];
      onSelect(resolveInheritedRequest(ancestors, req, collection?.config), {
        collectionId,
        nodeId,
      });
    },
    [collections, onSelect],
  );

  const clearDragUi = useCallback(() => {
    setDropTargetKey(null);
    setActiveDrag(null);
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setDropTargetKey(null);
      const drag = parseDragId(String(event.active.id));
      if (!drag) {
        setActiveDrag(null);
        return;
      }
      const collection = collections.find((c) => c.id === drag.collectionId);
      const node = collection ? findNode(collection.root, drag.nodeId) : null;
      if (node?.type === "request") {
        setActiveDrag({
          collectionId: drag.collectionId,
          name: node.name,
          method: node.method,
        });
      } else {
        setActiveDrag(null);
      }
    },
    [collections],
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id;
    if (typeof overId !== "string" || !overId.startsWith("drop:")) {
      setDropTargetKey(null);
      return;
    }
    setDropTargetKey(overId);
  }, []);

  const handleDragCancel = useCallback(() => {
    clearDragUi();
  }, [clearDragUi]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      clearDragUi();
      const { active, over } = event;
      if (!over) return;

      const drag = parseDragId(String(active.id));
      const drop = parseDropId(String(over.id));
      if (!(drag && drop)) return;
      if (drop.parentId === drag.nodeId) return;

      const sameCollection = drag.collectionId === drop.collectionId;
      void moveNode(
        drag.collectionId,
        drag.nodeId,
        drop.parentId,
        sameCollection ? undefined : drop.collectionId,
      ).then((ok) => {
        if (!ok) {
          alert("Could not move that item here.");
          return;
        }
        setExpandedCollections((prev) => new Set(prev).add(drop.collectionId));
      });
    },
    [clearDragUi, moveNode],
  );

  /* Recursive collection tree filter — keeps ancestors of matching nodes */
  const filterTree = useCallback(
    (nodes: CollectionNode[]): CollectionNode[] => {
      if (!search) return nodes;
      const out: CollectionNode[] = [];
      for (const n of nodes) {
        const selfMatch =
          matchesSearch(n.name, search) || (n.url ? matchesSearch(n.url, search) : false);
        const children = n.children ? filterTree(n.children) : [];
        if (selfMatch || children.length > 0) {
          out.push({ ...n, children: children.length > 0 ? children : n.children });
        }
      }
      return out;
    },
    [search],
  );

  /* Collections filtered by search */
  const filteredCollections = useMemo(
    () =>
      collections
        .filter((c) => c.id)
        .filter((c) => !search || matchesSearch(c.name, search) || filterTree(c.root).length > 0)
        .map((c) => ({ ...c, root: search ? filterTree(c.root) : c.root })),
    [collections, search, filterTree],
  );

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
          .then((nodeId) => {
            if (!nodeId) return;
            setExpandedCollections((prev) => new Set(prev).add(collectionId));
            // Link the active editor tab so ⌘S updates this node in place.
            const tabId = useTabStore.getState().activeTabId;
            if (tabId) {
              useTabStore.getState().setTabCollectionRef(tabId, { collectionId, nodeId });
            }
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
  const openFolderConfigModal = (collectionId: string, node: CollectionNode) => {
    setFolderConfigModal({
      folderName: node.name,
      config: node.folderConfig ?? {},
      scope: "folder",
      onSubmit: (config) => {
        setFolderConfig(collectionId, node.id, config).catch((err) =>
          alert(`Failed to save folder config: ${String(err)}`),
        );
      },
    });
  };
  const openCollectionConfigModal = (collectionId: string, name: string, config?: FolderConfig) => {
    setFolderConfigModal({
      folderName: name,
      config: config ?? {},
      scope: "collection",
      onSubmit: (next) => {
        setCollectionConfig(collectionId, next).catch((err) =>
          alert(`Failed to save collection config: ${String(err)}`),
        );
      },
    });
  };
  const openDeleteCollectionModal = (collectionId: string, name: string) => {
    setConfirmModal({
      title: "Delete Collection",
      message: `Delete collection "${name}"? This removes every folder and request inside it.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => {
        deleteCollection(collectionId).catch((err) =>
          alert(`Failed to delete collection: ${String(err)}`),
        );
      },
    });
  };
  const openDeleteNodeModal = (collectionId: string, node: CollectionNode) => {
    setConfirmModal({
      title: node.type === "folder" ? "Delete Folder" : "Delete Request",
      message:
        node.type === "folder"
          ? `Delete folder "${node.name}" and its children?`
          : `Delete "${node.name}" from this collection?`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => {
        removeNode(collectionId, node.id).catch((err) =>
          alert(`Failed to delete item: ${String(err)}`),
        );
      },
    });
  };

  if (!loaded) {
    return <SidebarLoadingState label="Loading collections…" />;
  }

  if (collections.length === 0 && !search) {
    return (
      <>
        <EmptyState
          icon="📁"
          label="No collections yet"
          action={{ label: "+ Create Collection", onClick: openCreateCollectionModal }}
        />
        {nameModal && <NameModal state={nameModal} onClose={() => setNameModal(null)} />}
        {confirmModal && (
          <ConfirmModal state={confirmModal} onClose={() => setConfirmModal(null)} />
        )}
      </>
    );
  }

  return (
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
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {filteredCollections.map((collection) => {
          const id = collection.id as string;
          const isExpanded = expandedCollections.has(id);
          const rootDropKey = dropId(id, null);
          return (
            <div key={id}>
              <DroppableCollectionRow
                collectionId={id}
                name={collection.name}
                expanded={isExpanded}
                requestCount={countRequests(collection.root)}
                dropActive={dropTargetKey === rootDropKey}
                hasConfig={hasFolderConfig(collection.config)}
                onToggle={() =>
                  setExpandedCollections((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                onExpand={() =>
                  setExpandedCollections((prev) => {
                    if (prev.has(id)) return prev;
                    return new Set(prev).add(id);
                  })
                }
                onAddRequest={
                  activeRequest?.url
                    ? () => openAddRequestModal(id, null, activeRequest)
                    : undefined
                }
                onAddFolder={() => openAddFolderModal(id, null)}
                onEditConfig={() =>
                  openCollectionConfigModal(id, collection.name, collection.config)
                }
                onRename={() => openRenameCollectionModal(id, collection.name)}
                onDelete={() => openDeleteCollectionModal(id, collection.name)}
              />

              {isExpanded &&
                collection.root.map((node) => (
                  <CollectionTreeNode
                    key={node.id}
                    node={node}
                    depth={1}
                    onSelect={(req, nodeId) => selectWithInheritance(id, req, nodeId)}
                    collectionId={collection.id}
                    activeRequest={activeRequest}
                    dropTargetKey={dropTargetKey}
                    onRenameNode={openRenameNodeModal}
                    onAddFolder={openAddFolderModal}
                    onAddRequest={openAddRequestModal}
                    onDeleteNode={openDeleteNodeModal}
                    onEditFolderConfig={openFolderConfigModal}
                  />
                ))}
            </div>
          );
        })}
        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <RequestDragPreview name={activeDrag.name} method={activeDrag.method} />
          ) : null}
        </DragOverlay>
      </DndContext>
      {nameModal && <NameModal state={nameModal} onClose={() => setNameModal(null)} />}
      {confirmModal && <ConfirmModal state={confirmModal} onClose={() => setConfirmModal(null)} />}
      {folderConfigModal && (
        <FolderConfigModal state={folderConfigModal} onClose={() => setFolderConfigModal(null)} />
      )}
    </>
  );
}
