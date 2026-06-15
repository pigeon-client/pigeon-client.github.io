import { create } from "zustand";
import {
  deleteDraft as dbDeleteDraft,
  saveDraft as dbSaveDraft,
  updateDraft as dbUpdateDraft,
  updateHistory as dbUpdateHistory,
  deleteHistoryEntry,
  getDrafts,
  getHistory,
  saveHistory,
} from "../lib/db";
import { normalizeUrlForMatch, parseUrl } from "../lib/url";
import type { HistoryItem, RequestConfig } from "../types";

/** Normalize a draft URL to ensure it has a protocol for consistent matching */
function normalizeDraftUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? url : parseUrl(url);
}

interface HistoryState {
  history: HistoryItem[];
  drafts: RequestConfig[];
  historyDbIds: Map<number, number>;
  draftDbIds: Map<number, number>;
  loaded: boolean;

  load: () => Promise<void>;
  addToHistory: (item: HistoryItem) => Promise<void>;
  saveDraft: (draft: RequestConfig) => Promise<void>;
  /** Find a draft by method+URL match key, returns [index, draft] or null */
  findDraftByKey: (method: string, url: string) => { index: number; draft: RequestConfig } | null;
  /** Update an existing draft's request fields (body, params, headers, auth, etc.) */
  updateDraftByKey: (method: string, url: string, updates: Partial<RequestConfig>) => Promise<void>;
  /** Smart save: creates if new, updates if exists */
  saveOrUpdateDraft: (draft: RequestConfig) => Promise<void>;
  removeDraft: (localIndex: number) => Promise<void>;
  removeHistory: (localIndex: number) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  drafts: [],
  historyDbIds: new Map(),
  draftDbIds: new Map(),
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    const draftRows = await getDrafts();
    const historyRows = await getHistory();
    const drafts = draftRows.map((r) => ({ ...r.data, id: r.id }));
    const history = historyRows.map((r) => ({ ...r.data, id: r.id }));
    const draftDbIds = new Map<number, number>();
    const historyDbIds = new Map<number, number>();
    drafts.forEach((d, i) => {
      if (d.id !== undefined) draftDbIds.set(i, d.id);
    });
    history.forEach((h, i) => {
      if (h.id !== undefined) historyDbIds.set(i, h.id);
    });
    set({ drafts, history, draftDbIds, historyDbIds, loaded: true });
  },

  addToHistory: async (item) => {
    const state = get();
    const key = normalizeUrlForMatch(item.method, normalizeDraftUrl(item.url));
    // Check for existing entry with same method+URL
    for (let i = 0; i < state.history.length; i++) {
      const existing = state.history[i];
      const existingKey = normalizeUrlForMatch(existing.method, normalizeDraftUrl(existing.url));
      if (existingKey === key) {
        // Update existing entry (status, responseTime, timestamp, name)
        const updated: HistoryItem = {
          ...existing,
          ...item,
          id: existing.id,
          method: existing.method,
          url: existing.url,
        };
        const dbId = state.historyDbIds.get(i) ?? existing.id;
        if (dbId !== undefined && dbId > 0) {
          await dbUpdateHistory(dbId, updated);
        }
        set((s) => {
          const newHistory = [...s.history];
          newHistory[i] = updated;
          return { history: newHistory };
        });
        return;
      }
    }
    // No duplicate found — create new entry
    const clean = { ...item, request: stripFiles(item.request) };
    const dbId = await saveHistory(clean);
    const itemWithId = { ...item, id: dbId };
    set((state) => {
      const newHistory = [itemWithId, ...state.history].slice(0, 100);
      const newIds = new Map(state.historyDbIds);
      if (dbId > 0) newIds.set(0, dbId);
      return { history: newHistory, historyDbIds: newIds };
    });
  },

  saveDraft: async (draft) => {
    const clean = stripFiles(draft);
    const dbId = await dbSaveDraft(clean);
    const draftWithId = { ...draft, id: dbId };
    set((state) => {
      const newDrafts = [draftWithId, ...state.drafts].slice(0, 50);
      const newIds = new Map(state.draftDbIds);
      // Shift existing indices by 1 since new draft is prepended
      for (const [idx, id] of state.draftDbIds) {
        newIds.set(idx + 1, id);
      }
      if (dbId > 0) newIds.set(0, dbId);
      return { drafts: newDrafts, draftDbIds: newIds };
    });
  },

  findDraftByKey: (method, url) => {
    const state = get();
    const key = normalizeUrlForMatch(method, normalizeDraftUrl(url));
    for (let i = 0; i < state.drafts.length; i++) {
      const draft = state.drafts[i];
      const draftKey = normalizeUrlForMatch(draft.method, normalizeDraftUrl(draft.url));
      if (draftKey === key) {
        return { index: i, draft };
      }
    }
    return null;
  },

  updateDraftByKey: async (method, url, updates) => {
    const state = get();
    const found = state.findDraftByKey(method, normalizeDraftUrl(url));
    if (!found) return;

    const dbId = state.draftDbIds.get(found.index) ?? found.draft.id;
    const updated: RequestConfig = {
      ...found.draft,
      ...updates,
      method: updates.method ?? found.draft.method,
      url: updates.url ?? found.draft.url,
    };

    // Persist to DB
    if (dbId !== undefined && dbId > 0) {
      await dbUpdateDraft(dbId, updated);
    }

    // Update in-memory state
    set((s) => {
      const newDrafts = [...s.drafts];
      newDrafts[found.index] = updated;
      return { drafts: newDrafts };
    });
  },

  saveOrUpdateDraft: async (draft) => {
    const state = get();
    const normalizedUrl = normalizeDraftUrl(draft.url);
    const key = normalizeUrlForMatch(draft.method, normalizedUrl);
    // Find existing draft directly (more reliable than calling through state)
    let existingIndex = -1;
    let existingDbId: number | undefined;
    for (let i = 0; i < state.drafts.length; i++) {
      const d = state.drafts[i];
      const dKey = normalizeUrlForMatch(d.method, normalizeDraftUrl(d.url));
      if (dKey === key) {
        existingIndex = i;
        existingDbId = state.draftDbIds.get(i) ?? d.id;
        break;
      }
    }

    if (existingIndex >= 0) {
      // Update existing draft
      const updated: RequestConfig = {
        ...state.drafts[existingIndex],
        ...draft,
        method: draft.method,
        url: draft.url,
      };
      if (existingDbId !== undefined && existingDbId > 0) {
        await dbUpdateDraft(existingDbId, updated);
      }
      set((s) => {
        const newDrafts = [...s.drafts];
        newDrafts[existingIndex] = updated;
        return { drafts: newDrafts };
      });
    } else {
      // Create new draft
      const clean = stripFiles(draft);
      const dbId = await dbSaveDraft(clean);
      const draftWithId = { ...draft, id: dbId };
      set((s) => {
        const newDrafts = [draftWithId, ...s.drafts].slice(0, 50);
        const newIds = new Map(s.draftDbIds);
        // Shift existing indices by 1
        for (const [idx, id] of s.draftDbIds) {
          newIds.set(idx + 1, id);
        }
        if (dbId > 0) newIds.set(0, dbId);
        return { drafts: newDrafts, draftDbIds: newIds };
      });
    }
  },

  removeDraft: async (localIndex) => {
    const state = get();
    const draft = state.drafts[localIndex];
    if (!draft) return;
    const dbId = state.draftDbIds.get(localIndex) ?? draft.id;
    if (dbId !== undefined && dbId > 0) {
      await dbDeleteDraft(dbId);
    }
    set((s) => ({
      drafts: s.drafts.filter((_, i) => i !== localIndex),
    }));
  },

  removeHistory: async (localIndex) => {
    const state = get();
    const item = state.history[localIndex];
    if (!item) return;
    const dbId = state.historyDbIds.get(localIndex) ?? item.id;
    if (dbId !== undefined && dbId > 0) {
      await deleteHistoryEntry(dbId);
    }
    set((s) => ({
      history: s.history.filter((_, i) => i !== localIndex),
    }));
  },
}));

function stripFiles(draft: RequestConfig): RequestConfig {
  return {
    ...draft,
    file: null,
    multipart: draft.multipart.map((f) => ({ ...f, file: null })),
  };
}
