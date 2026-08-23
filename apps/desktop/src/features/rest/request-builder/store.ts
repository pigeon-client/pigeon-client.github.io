import { useRef, useSyncExternalStore } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { type ApiResponse, EMPTY_BODY } from "@/core/http";
import { getWindowKind } from "@/shared/lib/windowKind";
import type { RequestConfig } from "@/shared/types";

function pathFromUrl(url: string): string {
  if (!url) return "Untitled Request";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.pathname && u.pathname !== "/" ? u.pathname : u.hostname || "Untitled Request";
  } catch {
    const m = url.match(/(?:https?:\/\/)?[^/]*(\/[^?# ]*)/);
    return m?.[1] || url || "Untitled Request";
  }
}

/** What a workspace tab hosts: an HTTP request (default), or a coming-soon MCP / GraphQL pane.
 *  Non-http tabs keep an (unused) default request so every consumer of `tab.request` stays total. */
export type TabKind = "http" | "mcp" | "graphql";

const KIND_NAMES: Record<Exclude<TabKind, "http">, string> = {
  mcp: "MCP",
  graphql: "GraphQL",
};

export interface Tab {
  id: string;
  kind: TabKind;
  name: string;
  nameLocked: boolean;
  request: RequestConfig;
  response: ApiResponse | null;
  isLoading: boolean;
  /** When set, ⌘S updates this collection node in place instead of opening the save modal. */
  collectionRef?: { collectionId: string; nodeId: string } | null;
}

export type TabShell = { id: string; kind: TabKind; hasUrl: boolean };
export type TabChrome = { id: string; name: string; kind: TabKind; method: string };

export function selectTabShells(tabs: Tab[]): TabShell[] {
  return tabs.map((t) => ({
    id: t.id,
    kind: t.kind,
    hasUrl: t.request.url.trim().length > 0,
  }));
}

export function tabShellsEqual(a: TabShell[], b: TabShell[]): boolean {
  return (
    a.length === b.length &&
    a.every((t, i) => t.id === b[i].id && t.kind === b[i].kind && t.hasUrl === b[i].hasUrl)
  );
}

export function selectTabChrome(tabs: Tab[]): TabChrome[] {
  return tabs.map((t) => ({
    id: t.id,
    name: t.name,
    kind: t.kind,
    method: t.request.method,
  }));
}

export function tabChromeEqual(a: TabChrome[], b: TabChrome[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (t, i) =>
        t.id === b[i].id &&
        t.name === b[i].name &&
        t.kind === b[i].kind &&
        t.method === b[i].method,
    )
  );
}

/** Zustand `create()` in this app is typed without an equalityFn arg — compare slices ourselves. */
export function useEqualStore<T, U>(
  store: UseBoundStore<StoreApi<T>>,
  selector: (state: T) => U,
  equal: (a: U, b: U) => boolean,
): U {
  const selected = useRef(selector(store.getState()));
  return useSyncExternalStore(
    (onStoreChange) =>
      store.subscribe(() => {
        const next = selector(store.getState());
        if (equal(selected.current, next)) return;
        selected.current = next;
        onStoreChange();
      }),
    () => selected.current,
    () => selected.current,
  );
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  nextId: number;

  addTab: (kind?: TabKind) => string;
  /** Focus the existing tab of this kind, or open one — singleton per kind. */
  openKindTab: (kind: Exclude<TabKind, "http">) => string;
  /** Clone a tab's request into a new tab (clears response). Returns new id or null. */
  duplicateTab: (id: string) => string | null;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  reorderTabs: (fromId: string, toId: string) => void;
  setActiveTab: (id: string) => void;
  updateTabRequest: (id: string, req: Partial<RequestConfig>) => void;
  updateTabResponse: (id: string, res: ApiResponse | null) => void;
  setTabLoading: (id: string, loading: boolean) => void;
  setTabName: (id: string, name: string) => void;
  setTabNameLocked: (id: string, locked: boolean) => void;
  setTabCollectionRef: (id: string, ref: { collectionId: string; nodeId: string } | null) => void;
  /** Load a full request into a tab and set/clear its collection link atomically. */
  loadTabRequest: (
    id: string,
    req: RequestConfig,
    collectionRef?: { collectionId: string; nodeId: string } | null,
  ) => void;
}

const defaultRequest = (): RequestConfig => ({
  name: "Untitled Request",
  nameLocked: false,
  method: "GET",
  url: "",
  params: [],
  headers: [],
  bodyType: "none",
  body: "",
  formData: [],
  multipart: [],
  file: null,
  auth: {
    type: "none",
    username: "",
    password: "",
    token: "",
    apiKey: "",
    apiValue: "",
    apiAddTo: "header",
  },
});

function cloneRequest(req: RequestConfig): RequestConfig {
  return {
    ...req,
    params: req.params.map((p) => ({ ...p })),
    headers: req.headers.map((h) => ({ ...h })),
    formData: req.formData.map((f) => ({ ...f })),
    multipart: req.multipart.map((m) => ({ ...m })),
    auth: { ...req.auth },
    // Same-session File handle is fine to share; collections still strip on save.
    file: req.file,
  };
}

let tabCounter = 1;

const TAB_STORAGE_KEY = "pg_open_tabs";

/** This window's fixed tab kind — "rest" maps to the default "http" tab kind. */
function defaultKindForWindow(): TabKind {
  const kind = getWindowKind();
  return kind === "rest" ? "http" : kind;
}

function buildTab(id: string, kind: TabKind): Tab {
  const name = kind === "http" ? "Untitled Request" : KIND_NAMES[kind];
  return {
    id,
    kind,
    name,
    // Non-http tabs keep a fixed name — URL-derived naming never applies.
    nameLocked: kind !== "http",
    request: { ...defaultRequest(), name },
    response: null,
    isLoading: false,
  };
}

function storageKey(): string {
  return `${TAB_STORAGE_KEY}:${getWindowKind()}`;
}

function persistableRequest(request: RequestConfig): RequestConfig {
  const withoutLiveFiles = (items: RequestConfig["params"]) =>
    items.map((item) => ({ ...item, file: null }));

  return {
    ...request,
    params: withoutLiveFiles(request.params),
    formData: withoutLiveFiles(request.formData),
    multipart: withoutLiveFiles(request.multipart),
    // File handles cannot survive an app restart. Keep metadata fields, drop live handle.
    file: null,
  };
}

const TAB_PERSIST_MS = 400;
const BODY_LRU_MAX_TABS = 8;
const BODY_LRU_MAX_BYTES = 48 * 1024 * 1024;

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersisted = "";
const bodyTouch = new Map<string, number>();
let bodyClock = 0;

function touchTabBody(id: string): void {
  bodyTouch.set(id, ++bodyClock);
}

function forgetTabBody(id: string): void {
  bodyTouch.delete(id);
}

function capTabBodies(tabs: Tab[], keepId: string | null): Tab[] {
  const ranked = tabs
    .map((tab) => ({
      id: tab.id,
      bytes: tab.response?.body.length ?? 0,
      at: bodyTouch.get(tab.id) ?? 0,
    }))
    .filter((row) => row.bytes > 0);
  let total = ranked.reduce((sum, row) => sum + row.bytes, 0);
  if (ranked.length <= BODY_LRU_MAX_TABS && total <= BODY_LRU_MAX_BYTES) return tabs;

  const drop = new Set<string>();
  for (const row of [...ranked].sort((a, b) => a.at - b.at)) {
    if (row.id === keepId) continue;
    if (ranked.length - drop.size <= BODY_LRU_MAX_TABS && total <= BODY_LRU_MAX_BYTES) break;
    drop.add(row.id);
    total -= row.bytes;
  }
  if (drop.size === 0) return tabs;
  return tabs.map((tab) => {
    if (!(drop.has(tab.id) && tab.response)) return tab;
    forgetTabBody(tab.id);
    return { ...tab, response: { ...tab.response, body: EMPTY_BODY, bodyEvicted: true } };
  });
}

function serializeTabs(state: Pick<TabState, "tabs" | "activeTabId">): string {
  return JSON.stringify({
    activeTabId: state.activeTabId,
    tabs: state.tabs.map((tab) => ({
      id: tab.id,
      kind: tab.kind,
      name: tab.name,
      nameLocked: tab.nameLocked,
      request: persistableRequest(tab.request),
      collectionRef: tab.collectionRef ?? null,
    })),
  });
}

function persistTabsNow(state: Pick<TabState, "tabs" | "activeTabId">): void {
  if (typeof localStorage === "undefined") return;
  const payload = serializeTabs(state);
  if (payload === lastPersisted) return;
  lastPersisted = payload;
  try {
    localStorage.setItem(storageKey(), payload);
  } catch {
    // Storage can be unavailable or full. In-memory tabs still work.
  }
}

function persistTabs(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistTabsNow(useTabStore.getState());
  }, TAB_PERSIST_MS);
}

function flushPersistedTabs(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  persistTabsNow(useTabStore.getState());
}

function restoreTabs(): Pick<TabState, "tabs" | "activeTabId"> | null {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return null;
    const saved = JSON.parse(raw) as {
      activeTabId?: unknown;
      tabs?: unknown;
    };
    if (!Array.isArray(saved.tabs)) return null;

    const tabs = saved.tabs.flatMap((value): Tab[] => {
      if (!value || typeof value !== "object") return [];
      const savedTab = value as Partial<Tab>;
      if (typeof savedTab.id !== "string" || !savedTab.request) return [];
      // Coming-soon workbenches are in-view (no tabs). Drop legacy mcp/graphql kind tabs.
      const kind: TabKind = "http";
      const defaults = defaultRequest();
      const request = savedTab.request as Partial<RequestConfig>;
      return [
        {
          id: savedTab.id,
          kind,
          name: typeof savedTab.name === "string" ? savedTab.name : defaults.name,
          nameLocked: Boolean(savedTab.nameLocked),
          request: {
            ...defaults,
            ...request,
            auth: { ...defaults.auth, ...(request.auth ?? {}) },
            params: Array.isArray(request.params) ? request.params : [],
            headers: Array.isArray(request.headers) ? request.headers : [],
            formData: Array.isArray(request.formData) ? request.formData : [],
            multipart: Array.isArray(request.multipart) ? request.multipart : [],
            file: null,
          },
          response: null,
          isLoading: false,
          collectionRef: (() => {
            const ref = savedTab.collectionRef;
            if (
              ref &&
              typeof ref === "object" &&
              typeof ref.collectionId === "string" &&
              typeof ref.nodeId === "string"
            ) {
              return { collectionId: ref.collectionId, nodeId: ref.nodeId };
            }
            return null;
          })(),
        },
      ];
    });
    if (tabs.length === 0) return null;

    const maxId = tabs.reduce((max, tab) => {
      const match = tab.id.match(/^tab-(\d+)$/);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0);
    tabCounter = Math.max(tabCounter, maxId + 1);

    return {
      tabs,
      activeTabId:
        typeof saved.activeTabId === "string" && tabs.some((tab) => tab.id === saved.activeTabId)
          ? saved.activeTabId
          : tabs[0].id,
    };
  } catch {
    return null;
  }
}

const restoredTabs = restoreTabs();

export const useTabStore = create<TabState>((set, get) => ({
  tabs: restoredTabs?.tabs ?? [],
  activeTabId: restoredTabs?.activeTabId ?? null,
  nextId: tabCounter,

  addTab: (kind = defaultKindForWindow()) => {
    const id = `tab-${tabCounter++}`;
    const tab = buildTab(id, kind);
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }));
    return id;
  },

  openKindTab: (kind) => {
    const existing = get().tabs.find((t) => t.kind === kind);
    if (existing) {
      set({ activeTabId: existing.id });
      return existing.id;
    }
    return get().addTab(kind);
  },

  duplicateTab: (id) => {
    const source = get().tabs.find((t) => t.id === id);
    if (!source) return null;

    const newId = `tab-${tabCounter++}`;
    // New tab with the same request payload — keep name / lock as-is (no "copy" suffix).
    const request = cloneRequest(source.request);
    const tab: Tab = {
      id: newId,
      kind: source.kind,
      name: source.name,
      nameLocked: source.nameLocked,
      request,
      response: null,
      isLoading: false,
      // Duplicate is a new copy — not linked to the source collection node.
      collectionRef: null,
    };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: newId,
    }));
    return newId;
  },

  closeTab: (id) => {
    forgetTabBody(id);
    set((s) => {
      const filtered = s.tabs.filter((t) => t.id !== id);
      let newActive = s.activeTabId;
      if (s.activeTabId === id) {
        const idx = s.tabs.findIndex((t) => t.id === id);
        newActive = filtered[Math.min(idx, filtered.length - 1)]?.id ?? null;
      }
      // If no tabs left, create one of this window's own kind
      if (filtered.length === 0) {
        const newId = `tab-${tabCounter++}`;
        return {
          tabs: [buildTab(newId, defaultKindForWindow())],
          activeTabId: newId,
        };
      }
      return { tabs: filtered, activeTabId: newActive };
    });
  },

  closeOtherTabs: (id) =>
    set((s) => {
      const keep = s.tabs.filter((t) => t.id === id);
      if (keep.length === 0) return s;
      for (const tab of s.tabs) {
        if (tab.id !== id) forgetTabBody(tab.id);
      }
      return { tabs: keep, activeTabId: id };
    }),

  closeAllTabs: () => {
    bodyTouch.clear();
    const newId = `tab-${tabCounter++}`;
    set({
      tabs: [buildTab(newId, defaultKindForWindow())],
      activeTabId: newId,
    });
  },

  reorderTabs: (fromId, toId) =>
    set((s) => {
      if (fromId === toId) return s;
      const fromIndex = s.tabs.findIndex((tab) => tab.id === fromId);
      const toIndex = s.tabs.findIndex((tab) => tab.id === toId);
      if (fromIndex < 0 || toIndex < 0) return s;
      const tabs = [...s.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      const targetIndex = tabs.findIndex((tab) => tab.id === toId);
      tabs.splice(targetIndex < 0 ? tabs.length : targetIndex, 0, moved);
      return { tabs };
    }),

  setActiveTab: (id) => {
    touchTabBody(id);
    set({ activeTabId: id });
  },

  updateTabRequest: (id, req) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        // Adopt an incoming lock flag (e.g. loading a saved request), else keep current.
        const nextLocked = req.nameLocked ?? t.nameLocked;
        let name = req.name ?? t.name;
        // Auto names track the URL path; manual names never change.
        if (!nextLocked && req.url !== undefined) name = pathFromUrl(req.url);
        const newRequest = { ...t.request, ...req, name, nameLocked: nextLocked };
        return { ...t, request: newRequest, name, nameLocked: nextLocked };
      }),
    })),

  updateTabResponse: (id, res) => {
    if (res?.body.length) touchTabBody(id);
    else forgetTabBody(id);
    set((s) => ({
      tabs: capTabBodies(
        s.tabs.map((t) => (t.id === id ? { ...t, response: res } : t)),
        s.activeTabId,
      ),
    }));
  },

  setTabLoading: (id, loading) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, isLoading: loading } : t)),
    })),

  setTabName: (id, name) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? { ...t, name, nameLocked: true, request: { ...t.request, name, nameLocked: true } }
          : t,
      ),
    })),
  setTabNameLocked: (id, locked) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? { ...t, nameLocked: locked, request: { ...t.request, nameLocked: locked } }
          : t,
      ),
    })),

  setTabCollectionRef: (id, ref) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, collectionRef: ref } : t)),
    })),

  loadTabRequest: (id, req, collectionRef = null) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        const nextLocked = req.nameLocked ?? t.nameLocked;
        let name = req.name ?? t.name;
        if (!nextLocked && req.url !== undefined) name = pathFromUrl(req.url);
        const newRequest = { ...t.request, ...req, name, nameLocked: nextLocked };
        return {
          ...t,
          request: newRequest,
          name,
          nameLocked: nextLocked,
          collectionRef: collectionRef ?? null,
        };
      }),
    })),
}));

useTabStore.subscribe(() => persistTabs());

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPersistedTabs);
}

// Initialize with one tab on first launch. Restored tabs stay untouched.
if (!restoredTabs) useTabStore.getState().addTab();
else lastPersisted = serializeTabs(restoredTabs);
