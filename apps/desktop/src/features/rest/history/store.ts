import { create } from "zustand";
import { persistStoreOnHmr } from "@/shared/lib/persistStoreOnHmr";
import { isTauri } from "@/shared/lib/platform";
import { normalizeUrlForMatch, parseUrl } from "@/shared/lib/url";
import type { RequestConfig } from "@/shared/types";
import type { FolderConfig } from "../collections/types";
import { getRetentionDays, partitionByRetention } from "./lib/retention";
import {
  deleteDraft as dbDeleteDraft,
  saveDraft as dbSaveDraft,
  updateDraft as dbUpdateDraft,
  updateHistory as dbUpdateHistory,
  deleteHistoryEntry,
  getDraftFolderConfigs,
  getDrafts,
  getHistory,
  getHistorySnapshot,
  pruneHistoryBefore,
  saveDraftFolderConfigs,
  saveHistory,
} from "./services/db";
import type { HistoryItem } from "./types";

// Browser build only — quota safety net, not a product limit (desktop relies on
// time-based retention pruned at app start instead, see partitionByRetention).
const BROWSER_HISTORY_CAP = 1000;
const BROWSER_DRAFT_CAP = 300;
const historyCapWarned = { current: false };
const draftCapWarned = { current: false };

/** Trim to the browser-only cap, oldest first, deleting the dropped rows from
 *  localStorage too (they were already persisted by the caller's insert) and
 *  logging once. No-op on desktop — Pigeon never silently drops history/drafts there. */
function trimForBrowser<T extends { id?: number }>(
  rows: T[],
  cap: number,
  warned: { current: boolean },
  _label: string,
  del: (id: number) => Promise<void>,
): T[] {
  if (isTauri() || rows.length <= cap) return rows;
  if (!warned.current) {
    warned.current = true;
  }
  const dropped = rows.slice(cap);
  for (const row of dropped) {
    if (row.id !== undefined) del(row.id);
  }
  return rows.slice(0, cap);
}

function reindexDbIds<T extends { id?: number }>(rows: T[]): Map<number, number> {
  const ids = new Map<number, number>();
  rows.forEach((row, i) => {
    if (row.id !== undefined && row.id > 0) ids.set(i, row.id);
  });
  return ids;
}

/** Normalize a draft URL to ensure it has a protocol for consistent matching */
function normalizeDraftUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? url : parseUrl(url);
}

const matchKeyCache = new WeakMap<object, string>();

function matchKeyOf(item: { method: string; url: string }): string {
  const cached = matchKeyCache.get(item);
  if (cached !== undefined) return cached;
  const key = normalizeUrlForMatch(item.method, normalizeDraftUrl(item.url));
  matchKeyCache.set(item, key);
  return key;
}

function indexByMatchKey(rows: { method: string; url: string }[]): Map<string, number> {
  const map = new Map<string, number>();
  rows.forEach((row, i) => {
    map.set(matchKeyOf(row), i);
  });
  return map;
}

interface HistoryState {
  history: HistoryItem[];
  drafts: RequestConfig[];
  historyDbIds: Map<number, number>;
  draftDbIds: Map<number, number>;
  historyKeyIndex: Map<string, number>;
  draftKeyIndex: Map<string, number>;
  /** Headers/auth set on a draft auto-folder (gear icon), keyed by that folder's
   *  deterministic host/path id. See `services/db.ts`. */
  draftFolderConfigs: Record<string, FolderConfig>;
  loaded: boolean;
  hadData: boolean;

  load: () => Promise<void>;
  reload: () => Promise<void>;
  setDraftFolderConfig: (folderId: string, config: FolderConfig) => void;
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
  /** Fill in a list-row snapshot whose `bodyText` was omitted at load. */
  ensureSnapshot: (item: HistoryItem) => Promise<HistoryItem>;
}

let historyLoadPromise: Promise<void> | null = null;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  drafts: [],
  historyDbIds: new Map(),
  draftDbIds: new Map(),
  historyKeyIndex: new Map(),
  draftKeyIndex: new Map(),
  draftFolderConfigs: {},
  loaded: false,
  hadData: false,

  load: async () => {
    if (get().loaded) return;
    if (historyLoadPromise) return historyLoadPromise;

    historyLoadPromise = (async () => {
      try {
        const [draftRows, historyRows] = await Promise.all([getDrafts(), getHistory()]);
        const draftFolderConfigs = getDraftFolderConfigs();
        const drafts = draftRows.map((r) => ({ ...r.data, id: r.id }));
        const historyAll = historyRows.map((r) => ({ ...r.data, id: r.id }));

        // Time-based retention, pruned once on app start only — never mid-session.
        const now = Date.now();
        const retentionDays = getRetentionDays();
        const { kept: history } = partitionByRetention(historyAll, retentionDays, now);

        const draftDbIds = reindexDbIds(drafts);
        const historyDbIds = reindexDbIds(history);
        set((state) => {
          const hasRows = drafts.length > 0 || history.length > 0;
          const inMemoryRows = state.drafts.length > 0 || state.history.length > 0;
          if (!hasRows && inMemoryRows) {
            return { loaded: true, hadData: true };
          }
          return {
            drafts,
            history,
            draftDbIds,
            historyDbIds,
            historyKeyIndex: indexByMatchKey(history),
            draftKeyIndex: indexByMatchKey(drafts),
            draftFolderConfigs,
            loaded: true,
            hadData: hasRows || state.hadData,
          };
        });

        if (retentionDays !== null) {
          const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
          void pruneHistoryBefore(cutoff);
        }
      } catch (err) {
        console.error("[Pigeon] Failed to load history/drafts", err);
      } finally {
        historyLoadPromise = null;
      }
    })();

    return historyLoadPromise;
  },

  reload: async () => {
    historyLoadPromise = null;
    set({ loaded: false });
    await get().load();
  },

  setDraftFolderConfig: (folderId, config) => {
    set((s) => {
      const draftFolderConfigs = { ...s.draftFolderConfigs, [folderId]: config };
      saveDraftFolderConfigs(draftFolderConfigs);
      return { draftFolderConfigs };
    });
  },

  addToHistory: async (item) => {
    const state = get();
    const key = matchKeyOf(item);
    const existingIndex = state.historyKeyIndex.get(key);
    const existing = existingIndex !== undefined ? state.history[existingIndex] : undefined;
    if (existing && existingIndex !== undefined) {
      // Update existing entry (status, responseTime, timestamp, name)
      const updated: HistoryItem = {
        ...existing,
        ...item,
        id: existing.id,
        method: existing.method,
        url: existing.url,
      };
      const dbId = state.historyDbIds.get(existingIndex) ?? existing.id;
      if (dbId !== undefined && dbId > 0) {
        await dbUpdateHistory(dbId, updated);
      }
      set((s) => {
        const newHistory = [...s.history];
        newHistory[existingIndex] = updated;
        return {
          history: newHistory,
          historyDbIds: reindexDbIds(newHistory),
          historyKeyIndex: indexByMatchKey(newHistory),
        };
      });
      return;
    }
    // No duplicate found — create new entry
    const clean = { ...item, request: stripFiles(item.request) };
    const dbId = await saveHistory(clean);
    const itemWithId = { ...item, id: dbId };
    set((state) => {
      const newHistory = trimForBrowser(
        [itemWithId, ...state.history],
        BROWSER_HISTORY_CAP,
        historyCapWarned,
        "history",
        deleteHistoryEntry,
      );
      return {
        history: newHistory,
        historyDbIds: reindexDbIds(newHistory),
        historyKeyIndex: indexByMatchKey(newHistory),
        hadData: true,
      };
    });
  },

  saveDraft: async (draft) => {
    const clean = stripFiles(draft);
    const dbId = await dbSaveDraft(clean);
    const draftWithId = { ...draft, id: dbId };
    set((state) => {
      const newDrafts = trimForBrowser(
        [draftWithId, ...state.drafts],
        BROWSER_DRAFT_CAP,
        draftCapWarned,
        "drafts",
        dbDeleteDraft,
      );
      return {
        drafts: newDrafts,
        draftDbIds: reindexDbIds(newDrafts),
        draftKeyIndex: indexByMatchKey(newDrafts),
        hadData: true,
      };
    });
  },

  findDraftByKey: (method, url) => {
    const state = get();
    const key = normalizeUrlForMatch(method, normalizeDraftUrl(url));
    const i = state.draftKeyIndex.get(key);
    if (i === undefined) return null;
    const draft = state.drafts[i];
    return draft ? { index: i, draft } : null;
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
      return {
        drafts: newDrafts,
        draftDbIds: reindexDbIds(newDrafts),
        draftKeyIndex: indexByMatchKey(newDrafts),
      };
    });
  },

  saveOrUpdateDraft: async (draft) => {
    const state = get();
    const normalizedUrl = normalizeDraftUrl(draft.url);
    const key = normalizeUrlForMatch(draft.method, normalizedUrl);
    // Find existing draft directly (more reliable than calling through state)
    const existingIndex = state.draftKeyIndex.get(key);
    const existingDbId =
      existingIndex !== undefined
        ? (state.draftDbIds.get(existingIndex) ?? state.drafts[existingIndex]?.id)
        : undefined;

    if (existingIndex !== undefined) {
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
        return {
          drafts: newDrafts,
          draftDbIds: reindexDbIds(newDrafts),
          draftKeyIndex: indexByMatchKey(newDrafts),
          hadData: true,
        };
      });
    } else {
      // Create new draft
      const clean = stripFiles(draft);
      const dbId = await dbSaveDraft(clean);
      const draftWithId = { ...draft, id: dbId };
      set((s) => {
        const newDrafts = trimForBrowser(
          [draftWithId, ...s.drafts],
          BROWSER_DRAFT_CAP,
          draftCapWarned,
          "drafts",
          dbDeleteDraft,
        );
        return {
          drafts: newDrafts,
          draftDbIds: reindexDbIds(newDrafts),
          draftKeyIndex: indexByMatchKey(newDrafts),
          hadData: true,
        };
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
    set((s) => {
      const drafts = s.drafts.filter((_, i) => i !== localIndex);
      return { drafts, draftDbIds: reindexDbIds(drafts), draftKeyIndex: indexByMatchKey(drafts) };
    });
  },

  removeHistory: async (localIndex) => {
    const state = get();
    const item = state.history[localIndex];
    if (!item) return;
    const dbId = state.historyDbIds.get(localIndex) ?? item.id;
    if (dbId !== undefined && dbId > 0) {
      await deleteHistoryEntry(dbId);
    }
    set((s) => {
      const history = s.history.filter((_, i) => i !== localIndex);
      return {
        history,
        historyDbIds: reindexDbIds(history),
        historyKeyIndex: indexByMatchKey(history),
      };
    });
  },

  ensureSnapshot: async (item) => {
    if (!item.snapshot?.bodyOmitted) return item;
    const id = item.id;
    if (id === undefined || id <= 0) return item;
    const snapshot = await getHistorySnapshot(id);
    if (!snapshot) return item;
    const updated: HistoryItem = { ...item, snapshot: { ...snapshot, bodyOmitted: false } };
    set((s) => ({
      history: s.history.map((h) => (h.id === id ? { ...h, snapshot: updated.snapshot } : h)),
    }));
    return updated;
  },
}));

function stripFiles(draft: RequestConfig): RequestConfig {
  return {
    ...draft,
    headers: draft.headers
      .filter((h) => !h.inherited)
      .map((h) => ({ key: h.key, value: h.value, enabled: h.enabled })),
    auth: draft.auth.inherited
      ? {
          type: "none",
          username: "",
          password: "",
          token: "",
          apiKey: "",
          apiValue: "",
          apiAddTo: draft.auth.apiAddTo,
        }
      : draft.auth,
    file: null,
    multipart: draft.multipart.map((f) => ({ ...f, file: null })),
  };
}

persistStoreOnHmr("history-store", useHistoryStore, {
  reload: () => void useHistoryStore.getState().load(),
  isLoaded: (s) => s.loaded,
});
