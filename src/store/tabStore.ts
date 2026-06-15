import { create } from "zustand";
import type { ApiResponse, RequestConfig } from "../types";

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

export interface Tab {
  id: string;
  name: string;
  nameLocked: boolean;
  request: RequestConfig;
  response: ApiResponse | null;
  isLoading: boolean;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  nextId: number;

  addTab: () => string;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (id: string) => void;
  updateTabRequest: (id: string, req: Partial<RequestConfig>) => void;
  updateTabResponse: (id: string, res: ApiResponse | null) => void;
  setTabLoading: (id: string, loading: boolean) => void;
  setTabName: (id: string, name: string) => void;
  setTabNameLocked: (id: string, locked: boolean) => void;
}

const defaultRequest = (): RequestConfig => ({
  name: "Untitled Request",
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

let tabCounter = 1;

export const useTabStore = create<TabState>((set) => ({
  tabs: [],
  activeTabId: null,
  nextId: 1,

  addTab: () => {
    const id = `tab-${tabCounter++}`;
    const tab: Tab = {
      id,
      name: "Untitled Request",
      nameLocked: false,
      request: { ...defaultRequest(), name: "Untitled Request" },
      response: null,
      isLoading: false,
    };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }));
    return id;
  },

  closeTab: (id) => {
    set((s) => {
      const filtered = s.tabs.filter((t) => t.id !== id);
      let newActive = s.activeTabId;
      if (s.activeTabId === id) {
        const idx = s.tabs.findIndex((t) => t.id === id);
        newActive = filtered[Math.min(idx, filtered.length - 1)]?.id ?? null;
      }
      // If no tabs left, create one
      if (filtered.length === 0) {
        const newId = `tab-${tabCounter++}`;
        return {
          tabs: [
            {
              id: newId,
              name: "Untitled Request",
              nameLocked: false,
              request: { ...defaultRequest(), name: "Untitled Request" },
              response: null,
              isLoading: false,
            },
          ],
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
      return { tabs: keep, activeTabId: id };
    }),

  closeAllTabs: () => {
    const newId = `tab-${tabCounter++}`;
    set({
      tabs: [
        {
          id: newId,
          name: "Untitled Request",
          nameLocked: false,
          request: { ...defaultRequest(), name: "Untitled Request" },
          response: null,
          isLoading: false,
        },
      ],
      activeTabId: newId,
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabRequest: (id, req) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        const newRequest = { ...t.request, ...req };
        const name = !t.nameLocked && req.url !== undefined ? pathFromUrl(req.url) : t.name;
        return { ...t, request: newRequest, name };
      }),
    })),

  updateTabResponse: (id, res) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, response: res } : t)),
    })),

  setTabLoading: (id, loading) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, isLoading: loading } : t)),
    })),

  setTabName: (id, name) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, name, nameLocked: true, request: { ...t.request, name } } : t,
      ),
    })),
  setTabNameLocked: (id, locked) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, nameLocked: locked } : t)),
    })),
}));

// Initialize with one tab
useTabStore.getState().addTab();
