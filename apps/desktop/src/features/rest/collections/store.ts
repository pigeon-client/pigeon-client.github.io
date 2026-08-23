import { create } from "zustand";
import { persistStoreOnHmr } from "@/shared/lib/persistStoreOnHmr";
import type { RequestConfig } from "@/shared/types";
import {
  deleteCollection as dbDeleteCollection,
  getCollections as dbGetCollections,
  patchCollectionConfig as dbPatchCollectionConfig,
  patchCollectionName as dbPatchCollectionName,
  saveCollection as dbSaveCollection,
  updateCollection as dbUpdateCollection,
} from "./services/db";
import {
  type Collection,
  type CollectionNode,
  type FolderConfig,
  MAX_NESTING_DEPTH,
} from "./types";

interface CollectionState {
  collections: Collection[];
  loaded: boolean;
  /** Set once we have successfully loaded or saved at least one collection. */
  hadData: boolean;

  load: () => Promise<void>;
  reload: () => Promise<void>;
  addCollection: (name: string) => Promise<string | null>;
  importCollection: (name: string, root: CollectionNode[]) => Promise<string | null>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  // Tree operations
  addFolder: (collectionId: string, parentId: string | null, name: string) => Promise<boolean>;
  addRequest: (
    collectionId: string,
    parentId: string | null,
    name: string,
    request: RequestConfig,
  ) => Promise<string | null>;
  removeNode: (collectionId: string, nodeId: string) => Promise<void>;
  renameNode: (collectionId: string, nodeId: string, name: string) => Promise<void>;
  setFolderConfig: (collectionId: string, nodeId: string, config: FolderConfig) => Promise<void>;
  setCollectionConfig: (collectionId: string, config: FolderConfig) => Promise<void>;
  /** Overwrite an existing request node in place (no modal / no re-parent). */
  updateRequest: (
    collectionId: string,
    nodeId: string,
    request: RequestConfig,
    name?: string,
  ) => Promise<boolean>;
  moveNode: (
    collectionId: string,
    nodeId: string,
    targetParentId: string | null,
    /** When set and different from `collectionId`, moves the node into that collection. */
    targetCollectionId?: string,
  ) => Promise<boolean>;

  reorderCollections: (ids: string[]) => void;
}

function stripFiles(request: RequestConfig): RequestConfig {
  return {
    ...request,
    // Don't persist headers that only exist via folder inheritance.
    headers: request.headers
      .filter((h) => !h.inherited)
      .map((h) => ({ key: h.key, value: h.value, enabled: h.enabled })),
    auth: request.auth.inherited
      ? {
          type: "none",
          username: "",
          password: "",
          token: "",
          apiKey: "",
          apiValue: "",
          apiAddTo: request.auth.apiAddTo,
        }
      : request.auth,
    file: null,
    multipart: request.multipart.map((f) => ({ ...f, file: null })),
  };
}

function getDepth(node: CollectionNode, current: number = 0): number {
  if (node.type === "request") return current;
  let max = current;
  for (const child of node.children ?? []) {
    const d = getDepth(child, current + 1);
    if (d > max) max = d;
  }
  return max;
}

function treeDepth(nodes: CollectionNode[]): number {
  return nodes.reduce((max, node) => Math.max(max, getDepth(node)), 0);
}

function removeById(nodes: CollectionNode[], id: string): CollectionNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.type === "folder" ? { ...n, children: removeById(n.children ?? [], id) } : n));
}

function insertChild(
  nodes: CollectionNode[],
  parentId: string,
  child: CollectionNode,
): CollectionNode[] | null {
  let found = false;
  const next = nodes.map((node) => {
    if (node.id === parentId && node.type === "folder") {
      found = true;
      return { ...node, children: [...(node.children ?? []), child] };
    }
    if (node.type !== "folder") return node;
    const children = insertChild(node.children ?? [], parentId, child);
    if (!children) return node;
    found = true;
    return { ...node, children };
  });
  return found ? next : null;
}

function renameById(nodes: CollectionNode[], id: string, name: string): CollectionNode[] | null {
  let found = false;
  const next = nodes.map((node) => {
    if (node.id === id) {
      found = true;
      return { ...node, name };
    }
    if (node.type !== "folder") return node;
    const children = renameById(node.children ?? [], id, name);
    if (!children) return node;
    found = true;
    return { ...node, children };
  });
  return found ? next : null;
}

function setFolderConfigById(
  nodes: CollectionNode[],
  id: string,
  config: FolderConfig,
): CollectionNode[] | null {
  let found = false;
  const next = nodes.map((node) => {
    if (node.id === id && node.type === "folder") {
      found = true;
      return { ...node, folderConfig: config };
    }
    if (node.type !== "folder") return node;
    const children = setFolderConfigById(node.children ?? [], id, config);
    if (!children) return node;
    found = true;
    return { ...node, children };
  });
  return found ? next : null;
}

function updateRequestById(
  nodes: CollectionNode[],
  id: string,
  request: RequestConfig,
  name: string,
): CollectionNode[] | null {
  let found = false;
  const next = nodes.map((node) => {
    if (node.id === id && node.type === "request") {
      found = true;
      return {
        ...node,
        name,
        request,
        method: request.method,
        url: request.url,
      };
    }
    if (node.type !== "folder") return node;
    const children = updateRequestById(node.children ?? [], id, request, name);
    if (!children) return node;
    found = true;
    return { ...node, children };
  });
  return found ? next : null;
}

function findParentId(
  nodes: CollectionNode[],
  nodeId: string,
  parentId: string | null = null,
): string | null | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) return parentId;
    if (node.type === "folder") {
      const found = findParentId(node.children ?? [], nodeId, node.id);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function containsNode(root: CollectionNode, id: string): boolean {
  if (root.id === id) return true;
  if (root.type !== "folder") return false;
  return (root.children ?? []).some((child) => containsNode(child, id));
}

/** Depth of a node from the collection root (root children = 0). */
function nestingDepthFromRoot(nodes: CollectionNode[], id: string, depth = 0): number | null {
  for (const node of nodes) {
    if (node.id === id) return depth;
    if (node.type === "folder") {
      const found = nestingDepthFromRoot(node.children ?? [], id, depth + 1);
      if (found !== null) return found;
    }
  }
  return null;
}

let nodeCounter = 0;
function genNodeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `node-${crypto.randomUUID()}`;
  return `node-${Date.now()}-${++nodeCounter}`;
}

let collectionsLoadPromise: Promise<void> | null = null;

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  loaded: false,
  hadData: false,

  load: async () => {
    if (get().loaded) return;
    if (collectionsLoadPromise) return collectionsLoadPromise;

    collectionsLoadPromise = (async () => {
      try {
        const rows = await dbGetCollections();
        const fromDb = rows.map((r) => JSON.parse(r.data) as Collection);
        set((state) => {
          // Don't clobber in-memory data with a stale empty fetch (startup race).
          if (fromDb.length === 0 && state.collections.length > 0) {
            return { loaded: true, hadData: true };
          }
          return {
            collections: fromDb,
            loaded: true,
            hadData: fromDb.length > 0 || state.hadData,
          };
        });
      } catch (err) {
        console.error("[Pigeon] Failed to load collections", err);
      } finally {
        collectionsLoadPromise = null;
      }
    })();

    return collectionsLoadPromise;
  },

  reload: async () => {
    collectionsLoadPromise = null;
    set({ loaded: false });
    await get().load();
  },

  addCollection: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `col-${crypto.randomUUID()}`
        : `col-${Date.now()}`;
    const collection: Collection = {
      id,
      name: trimmed,
      root: [],
      createdAt: Date.now(),
    };
    await dbSaveCollection(collection);
    set((state) => ({
      collections: [...state.collections, collection],
      hadData: true,
    }));
    return id;
  },

  // Bulk-create a collection with a pre-built tree (Postman import etc.) — one
  // write, instead of replaying addFolder/addRequest per node.
  importCollection: async (name, root) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `col-${crypto.randomUUID()}`
        : `col-${Date.now()}`;
    const collection: Collection = {
      id,
      name: trimmed,
      root,
      createdAt: Date.now(),
    };
    await dbSaveCollection(collection);
    set((state) => ({
      collections: [...state.collections, collection],
      hadData: true,
    }));
    return id;
  },

  renameCollection: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const state = get();
    const collection = state.collections.find((c) => c.id === id);
    if (!collection) return;
    const updated = { ...collection, name: trimmed };
    await dbPatchCollectionName(id, trimmed);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === id ? updated : c)),
    }));
  },

  deleteCollection: async (id) => {
    await dbDeleteCollection(id);
    set((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
    }));
  },

  addFolder: async (collectionId, parentId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return false;

    const newFolder: CollectionNode = {
      id: genNodeId(),
      type: "folder",
      name: trimmed,
      children: [],
    };

    let root: CollectionNode[];
    if (parentId) {
      const parentNode = findNode(collection.root, parentId);
      if (parentNode?.type !== "folder") return false;
      if (getDepth(parentNode) >= MAX_NESTING_DEPTH) return false;
      const next = insertChild(collection.root, parentId, newFolder);
      if (!next) return false;
      root = next;
    } else {
      if (treeDepth(collection.root) >= MAX_NESTING_DEPTH) return false;
      root = [...collection.root, newFolder];
    }

    const updated = { ...collection, root };
    await dbUpdateCollection(updated);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
    return true;
  },

  addRequest: async (collectionId, parentId, name, request) => {
    const trimmed = name.trim() || request.name || request.url || "Untitled Request";
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return null;

    const newRequest: CollectionNode = {
      id: genNodeId(),
      type: "request",
      name: trimmed,
      request: stripFiles(request),
      method: request.method,
      url: request.url,
    };

    let root: CollectionNode[];
    if (parentId) {
      const parentNode = findNode(collection.root, parentId);
      if (parentNode?.type !== "folder") return null;
      const next = insertChild(collection.root, parentId, newRequest);
      if (!next) return null;
      root = next;
    } else {
      root = [...collection.root, newRequest];
    }

    const updated = { ...collection, root };
    await dbUpdateCollection(updated);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
    return newRequest.id;
  },

  removeNode: async (collectionId, nodeId) => {
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const updated = {
      ...collection,
      root: removeById(collection.root, nodeId),
    };

    await dbUpdateCollection(updated);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
  },

  renameNode: async (collectionId, nodeId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const root = renameById(collection.root, nodeId, trimmed);
    if (!root) return;
    const updated = { ...collection, root };

    await dbUpdateCollection(updated);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
  },

  setFolderConfig: async (collectionId, nodeId, config) => {
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const root = setFolderConfigById(collection.root, nodeId, config);
    if (!root) return;
    const updated = { ...collection, root };

    await dbUpdateCollection(updated);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
  },

  setCollectionConfig: async (collectionId, config) => {
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const updated = { ...collection, config };
    await dbPatchCollectionConfig(collectionId, config);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
  },

  updateRequest: async (collectionId, nodeId, request, name) => {
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return false;

    const existing = findNode(collection.root, nodeId);
    if (existing?.type !== "request") return false;

    const trimmed =
      name?.trim() || request.name?.trim() || existing.name || request.url || "Untitled Request";
    const root = updateRequestById(collection.root, nodeId, stripFiles(request), trimmed);
    if (!root) return false;

    const updated = { ...collection, root };
    await dbUpdateCollection(updated);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
    return true;
  },

  moveNode: async (collectionId, nodeId, targetParentId, targetCollectionId) => {
    const state = get();
    const source = state.collections.find((c) => c.id === collectionId);
    if (!source) return false;

    const destId = targetCollectionId ?? collectionId;
    const dest = state.collections.find((c) => c.id === destId);
    if (!dest) return false;

    const node = findNode(source.root, nodeId);
    if (!node) return false;
    if (targetParentId === nodeId) return false;

    // Same-collection move
    if (destId === collectionId) {
      if (targetParentId && node.type === "folder" && containsNode(node, targetParentId))
        return false;
      if (findParentId(source.root, nodeId) === targetParentId) return true;

      const withoutNode = removeById(source.root, nodeId);

      let root: CollectionNode[];
      if (targetParentId) {
        const parentNode = findNode(withoutNode, targetParentId);
        if (parentNode?.type !== "folder") return false;
        const parentDepth = nestingDepthFromRoot(withoutNode, targetParentId);
        if (parentDepth === null) return false;
        // Node will sit at parentDepth+1; its subtree adds getDepth(node).
        if (parentDepth + 1 + getDepth(node) > MAX_NESTING_DEPTH) return false;
        const next = insertChild(withoutNode, targetParentId, node);
        if (!next) return false;
        root = next;
      } else {
        if (getDepth(node) > MAX_NESTING_DEPTH) return false;
        root = [...withoutNode, node];
      }

      const updated = { ...source, root };
      await dbUpdateCollection(updated);
      set((s) => ({
        collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
      }));
      return true;
    }

    // Cross-collection move: remove from source, insert into dest.
    if (targetParentId) {
      const parentNode = findNode(dest.root, targetParentId);
      if (parentNode?.type !== "folder") return false;
      const parentDepth = nestingDepthFromRoot(dest.root, targetParentId);
      if (parentDepth === null) return false;
      if (parentDepth + 1 + getDepth(node) > MAX_NESTING_DEPTH) return false;
    } else if (getDepth(node) > MAX_NESTING_DEPTH) {
      return false;
    }

    const sourceRoot = removeById(source.root, nodeId);
    let destRoot: CollectionNode[];
    if (targetParentId) {
      const next = insertChild(dest.root, targetParentId, node);
      if (!next) return false;
      destRoot = next;
    } else {
      destRoot = [...dest.root, node];
    }

    const updatedSource = { ...source, root: sourceRoot };
    const updatedDest = { ...dest, root: destRoot };
    // Dest first: the node exists in two collections briefly — safer than existing
    // nowhere. If source persist then fails, roll dest back to the pre-move tree.
    try {
      await dbUpdateCollection(updatedDest);
    } catch {
      return false;
    }
    try {
      await dbUpdateCollection(updatedSource);
    } catch {
      await dbUpdateCollection(dest);
      return false;
    }
    set((s) => ({
      collections: s.collections.map((c) => {
        if (c.id === collectionId) return updatedSource;
        if (c.id === destId) return updatedDest;
        return c;
      }),
    }));
    return true;
  },

  reorderCollections: (ids) => {
    set((s) => {
      const map = new Map(s.collections.map((c) => [c.id, c]));
      return {
        collections: ids
          .map((id) => map.get(id))
          .filter((c): c is NonNullable<typeof c> => c != null),
      };
    });
  },
}));

/** Recursively find a node by ID in a tree */
export function findNode(nodes: CollectionNode[], id: string): CollectionNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === "folder") {
      const found = findNode(node.children ?? [], id);
      if (found) return found;
    }
  }
  return null;
}

/** Locate a saved request by method+url. Returns null when zero or ambiguous matches. */
export function findUniqueSavedRequest(
  collections: Collection[],
  method: string,
  url: string,
): { collectionId: string; nodeId: string } | null {
  const needleMethod = method.toUpperCase();
  const needleUrl = url.trim();
  if (!needleUrl) return null;

  const matches: { collectionId: string; nodeId: string }[] = [];
  const walk = (collectionId: string, nodes: CollectionNode[]) => {
    for (const node of nodes) {
      if (node.type === "folder") {
        walk(collectionId, node.children ?? []);
        continue;
      }
      const nodeMethod = (node.method ?? node.request?.method ?? "").toUpperCase();
      const nodeUrl = (node.url ?? node.request?.url ?? "").trim();
      if (nodeMethod === needleMethod && nodeUrl === needleUrl) {
        matches.push({ collectionId, nodeId: node.id });
      }
    }
  };

  for (const collection of collections) {
    if (!collection.id) continue;
    walk(collection.id, collection.root);
  }

  return matches.length === 1 ? matches[0] : null;
}

persistStoreOnHmr("collection-store", useCollectionStore, {
  reload: () => void useCollectionStore.getState().load(),
  isLoaded: (s) => s.loaded,
});
