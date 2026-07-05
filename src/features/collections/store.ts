import { create } from "zustand";
import type { RequestConfig } from "@/shared/types";
import {
  deleteCollection as dbDeleteCollection,
  getCollections as dbGetCollections,
  saveCollection as dbSaveCollection,
  updateCollection as dbUpdateCollection,
} from "./services/db";
import { type Collection, type CollectionNode, MAX_NESTING_DEPTH } from "./types";

interface CollectionState {
  collections: Collection[];
  loaded: boolean;

  load: () => Promise<void>;
  addCollection: (name: string) => Promise<string | null>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  // Tree operations
  addFolder: (collectionId: string, parentId: string | null, name: string) => Promise<boolean>;
  addRequest: (
    collectionId: string,
    parentId: string | null,
    name: string,
    request: RequestConfig,
  ) => Promise<boolean>;
  removeNode: (collectionId: string, nodeId: string) => Promise<void>;
  renameNode: (collectionId: string, nodeId: string, name: string) => Promise<void>;
  moveNode: (
    collectionId: string,
    nodeId: string,
    targetParentId: string | null,
  ) => Promise<boolean>;

  reorderCollections: (ids: string[]) => void;
}

function stripFiles(request: RequestConfig): RequestConfig {
  return {
    ...request,
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

let nodeCounter = 0;
function genNodeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `node-${crypto.randomUUID()}`;
  return `node-${Date.now()}-${++nodeCounter}`;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const rows = await dbGetCollections();
      const collections = rows.map((r) => JSON.parse(r.data) as Collection);
      set({ collections, loaded: true });
    } catch {
      set({ loaded: true });
    }
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
    await dbUpdateCollection(updated);
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
    if (!collection) return false;

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
      if (parentNode?.type !== "folder") return false;
      const next = insertChild(collection.root, parentId, newRequest);
      if (!next) return false;
      root = next;
    } else {
      root = [...collection.root, newRequest];
    }

    const updated = { ...collection, root };
    await dbUpdateCollection(updated);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
    return true;
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

  moveNode: async (collectionId, nodeId, targetParentId) => {
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return false;

    // Find and remove the node from its current location
    const node = findNode(collection.root, nodeId);
    if (!node) return false;
    if (targetParentId === nodeId) return false;
    if (targetParentId && node.type === "folder" && containsNode(node, targetParentId))
      return false;
    if (findParentId(collection.root, nodeId) === targetParentId) return true;

    const withoutNode = removeById(collection.root, nodeId);

    let root: CollectionNode[];
    if (targetParentId) {
      const parentNode = findNode(withoutNode, targetParentId);
      if (parentNode?.type !== "folder") return false;
      const next = insertChild(withoutNode, targetParentId, node);
      if (!next) return false;
      root = next;
    } else {
      root = [...withoutNode, node];
    }

    const updated = { ...collection, root };
    await dbUpdateCollection(updated);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
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
