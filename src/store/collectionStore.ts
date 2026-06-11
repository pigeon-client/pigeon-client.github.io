import { create } from 'zustand';
import { Collection, CollectionNode, RequestConfig, MAX_NESTING_DEPTH } from '../types';
import {
  saveCollection as dbSaveCollection,
  getCollections as dbGetCollections,
  updateCollection as dbUpdateCollection,
  deleteCollection as dbDeleteCollection,
} from '../lib/db';

interface CollectionState {
  collections: Collection[];
  loaded: boolean;

  load: () => Promise<void>;
  addCollection: (name: string) => Promise<string | null>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  // Tree operations
  addFolder: (collectionId: string, parentId: string | null, name: string) => Promise<boolean>;
  addRequest: (collectionId: string, parentId: string | null, name: string, request: RequestConfig) => Promise<boolean>;
  removeNode: (collectionId: string, nodeId: string) => Promise<void>;
  renameNode: (collectionId: string, nodeId: string, name: string) => Promise<void>;
  moveNode: (collectionId: string, nodeId: string, targetParentId: string | null) => Promise<boolean>;

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
  if (node.type === 'request') return current;
  let max = current;
  for (const child of (node.children ?? [])) {
    const d = getDepth(child, current + 1);
    if (d > max) max = d;
  }
  return max;
}

function removeById(nodes: CollectionNode[], id: string): CollectionNode[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => n.type === 'folder' ? { ...n, children: removeById(n.children ?? [], id) } : n);
}

let nodeCounter = 0;
function genNodeId(): string {
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
    const id = `col-${Date.now()}`;
    const collection: Collection = {
      id,
      name,
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
    const state = get();
    const collection = state.collections.find((c) => c.id === id);
    if (!collection) return;
    const updated = { ...collection, name };
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
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return false;

    const newFolder: CollectionNode = {
      id: genNodeId(),
      type: 'folder',
      name,
      children: [],
    };

    const updated = { ...collection };
    if (parentId) {
      // Check depth constraint
      const parentNode = findNode(updated.root, parentId);
      if (!parentNode || parentNode.type !== 'folder') return false;
      const depth = getDepth(parentNode);
      if (depth >= MAX_NESTING_DEPTH) return false;
      parentNode.children = [...(parentNode.children ?? []), newFolder];
    } else {
      updated.root = [...updated.root, newFolder];
    }

    await dbUpdateCollection(updated);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
    return true;
  },

  addRequest: async (collectionId, parentId, name, request) => {
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return false;

    const newRequest: CollectionNode = {
      id: genNodeId(),
      type: 'request',
      name,
      request: stripFiles(request),
      method: request.method,
      url: request.url,
    };

    const updated = { ...collection };
    if (parentId) {
      const parentNode = findNode(updated.root, parentId);
      if (!parentNode || parentNode.type !== 'folder') return false;
      parentNode.children = [...(parentNode.children ?? []), newRequest];
    } else {
      updated.root = [...updated.root, newRequest];
    }

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
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const node = findNode(collection.root, nodeId);
    if (!node) return;
    node.name = name;

    await dbUpdateCollection(collection);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === collectionId ? { ...collection } : c)),
    }));
  },

  moveNode: async (collectionId, nodeId, targetParentId) => {
    const state = get();
    const collection = state.collections.find((c) => c.id === collectionId);
    if (!collection) return false;

    // Find and remove the node from its current location
    const node = findNode(collection.root, nodeId);
    if (!node) return false;

    const updated = {
      ...collection,
      root: removeById(collection.root, nodeId),
    };

    // Add to target
    if (targetParentId) {
      const parentNode = findNode(updated.root, targetParentId);
      if (!parentNode || parentNode.type !== 'folder') return false;
      parentNode.children = [...(parentNode.children ?? []), node];
    } else {
      updated.root = [...updated.root, node];
    }

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
        collections: ids.map((id) => map.get(id)!).filter(Boolean),
      };
    });
  },
}));

/** Recursively find a node by ID in a tree */
export function findNode(nodes: CollectionNode[], id: string): CollectionNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'folder') {
      const found = findNode(node.children ?? [], id);
      if (found) return found;
    }
  }
  return null;
}
