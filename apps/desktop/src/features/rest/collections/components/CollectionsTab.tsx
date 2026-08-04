import { Button } from "@pigeon/ui";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { RequestConfig } from "@/shared/types";
import { ConfirmModal, type ConfirmModalState } from "@/shared/ui/ConfirmModal";
import { EmptyState } from "@/shared/ui/EmptyState";
import { TreeRow } from "@/shared/ui/TreeRow";
import { resolveInheritedRequest } from "../lib/inheritance";
import { countRequests, findAncestors } from "../lib/tree";
import { useCollectionStore } from "../store";
import type { CollectionNode, FolderConfig } from "../types";
import { FolderConfigModal, type FolderConfigModalState } from "./FolderConfigModal";
import { NameModal, type NameModalState } from "./NameModal";

function hasFolderConfig(config: FolderConfig | undefined): boolean {
  return !!config && (!!config.headers?.length || (!!config.auth && config.auth.type !== "none"));
}

function matchesSearch(text: string, search: string): boolean {
  return !search || text.toLowerCase().includes(search.toLowerCase());
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
  onDeleteNode,
  onEditFolderConfig,
}: {
  node: CollectionNode;
  depth: number;
  onSelect: (req: RequestConfig, nodeId: string) => void;
  collectionId?: string;
  activeRequest?: RequestConfig | null;
  onRenameNode: (collectionId: string, node: CollectionNode) => void;
  onAddFolder: (collectionId: string, parentId: string | null) => void;
  onAddRequest: (collectionId: string, parentId: string | null, request: RequestConfig) => void;
  onDeleteNode: (collectionId: string, node: CollectionNode) => void;
  onEditFolderConfig: (collectionId: string, node: CollectionNode) => void;
}) {
  // Folders start collapsed by default.
  const [expanded, setExpanded] = useState(false);

  if (!collectionId) return null;

  if (node.type === "request") {
    return (
      <TreeRow
        depth={depth}
        isFolder={false}
        label={node.name}
        method={node.method}
        onClick={() => node.request && onSelect(node.request, node.id)}
        onRename={() => onRenameNode(collectionId, node)}
        onDelete={() => onDeleteNode(collectionId, node)}
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
        hasConfig={hasFolderConfig(node.folderConfig)}
        onClick={() => setExpanded((e) => !e)}
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
  onSelect: (req: RequestConfig) => void;
}) {
  const collections = useCollectionStore((s) => s.collections);
  const addCollection = useCollectionStore((s) => s.addCollection);
  const renameCollection = useCollectionStore((s) => s.renameCollection);
  const deleteCollection = useCollectionStore((s) => s.deleteCollection);
  const renameNode = useCollectionStore((s) => s.renameNode);
  const removeNode = useCollectionStore((s) => s.removeNode);
  const addFolder = useCollectionStore((s) => s.addFolder);
  const addRequest = useCollectionStore((s) => s.addRequest);
  const setFolderConfig = useCollectionStore((s) => s.setFolderConfig);

  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [nameModal, setNameModal] = useState<NameModalState | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [folderConfigModal, setFolderConfigModal] = useState<FolderConfigModalState | null>(null);

  /* Merge ancestor folder headers/auth into the request before opening it. */
  const selectWithInheritance = useCallback(
    (collectionId: string, req: RequestConfig, nodeId: string) => {
      const collection = collections.find((c) => c.id === collectionId);
      const ancestors = collection ? findAncestors(collection.root, nodeId) : [];
      onSelect(resolveInheritedRequest(ancestors, req));
    },
    [collections, onSelect],
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
  const openFolderConfigModal = (collectionId: string, node: CollectionNode) => {
    setFolderConfigModal({
      folderName: node.name,
      config: node.folderConfig ?? {},
      onSubmit: (config) => {
        setFolderConfig(collectionId, node.id, config).catch((err) =>
          alert(`Failed to save folder config: ${String(err)}`),
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
                activeRequest?.url ? () => openAddRequestModal(id, null, activeRequest) : undefined
              }
              onAddFolder={() => openAddFolderModal(id, null)}
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
      {nameModal && <NameModal state={nameModal} onClose={() => setNameModal(null)} />}
      {confirmModal && <ConfirmModal state={confirmModal} onClose={() => setConfirmModal(null)} />}
      {folderConfigModal && (
        <FolderConfigModal state={folderConfigModal} onClose={() => setFolderConfigModal(null)} />
      )}
    </>
  );
}
