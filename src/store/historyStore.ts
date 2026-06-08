import { create } from 'zustand';
import { HistoryItem, RequestConfig } from '../types';
import { saveDraft as dbSaveDraft, getDrafts, deleteDraft as dbDeleteDraft, saveHistory, getHistory, deleteHistoryEntry } from '../lib/db';

interface HistoryState {
  history: HistoryItem[];
  drafts: RequestConfig[];
  historyDbIds: Map<number, number>;
  draftDbIds: Map<number, number>;
  loaded: boolean;

  load: () => Promise<void>;
  addToHistory: (item: HistoryItem) => Promise<void>;
  saveDraft: (draft: RequestConfig) => Promise<void>;
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
    drafts.forEach((d, i) => { if (d.id !== undefined) draftDbIds.set(i, d.id); });
    history.forEach((h, i) => { if (h.id !== undefined) historyDbIds.set(i, h.id); });
    set({ drafts, history, draftDbIds, historyDbIds, loaded: true });
  },

  addToHistory: async (item) => {
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
      if (dbId > 0) newIds.set(0, dbId);
      return { drafts: newDrafts, draftDbIds: newIds };
    });
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
