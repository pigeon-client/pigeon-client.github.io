import { createNumTableStore, numTable } from "@/core/persistence";
import type { RequestConfig } from "@/shared/types";
import type { FolderConfig } from "../../collections/types";
import type { HistoryItem } from "../types";

const DRAFTS = "pg_browser_drafts";
const HISTORY = "pg_browser_history";
const DRAFT_FOLDER_CONFIGS_KEY = "pg_draft_folder_configs";

export function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);
}

/** Pure half — drop the oldest half of snapshots (insertion order = oldest first).
 *  Exported for direct unit testing without a real localStorage quota to trip. */
export function stripOldestSnapshots(
  rows: { id: number; data: HistoryItem }[],
): { id: number; data: HistoryItem }[] {
  const withSnapshot = rows.filter((r) => r.data.snapshot);
  if (withSnapshot.length === 0) return rows;
  const toStrip = withSnapshot.slice(0, Math.max(1, Math.ceil(withSnapshot.length / 2)));
  const stripIds = new Set(toStrip.map((r) => r.id));
  return rows.map((r) =>
    stripIds.has(r.id) ? { id: r.id, data: { ...r.data, snapshot: undefined } } : r,
  );
}

/** Under localStorage quota pressure, drop snapshots (oldest first) before giving
 *  up — the request/status/timing fields are worth far more than the cached body. */
function dropOldestSnapshots(): boolean {
  const rows = numTable.all<HistoryItem>(HISTORY);
  if (!rows.some((r) => r.data.snapshot)) return false;
  numTable.replaceAll(HISTORY, stripOldestSnapshots(rows));
  return true;
}

/** Retry a browser-table write once after dropping snapshots if it hits quota. */
function withQuotaGuard<T>(write: () => T): T {
  try {
    return write();
  } catch (e) {
    if (!(isQuotaError(e) && dropOldestSnapshots())) throw e;
    return write();
  }
}

const draftsStore = createNumTableStore<RequestConfig>({
  browserKey: DRAFTS,
  commands: {
    save: "save_draft",
    getAll: "get_drafts",
    update: "update_draft",
    delete: "delete_draft",
  },
});

const historyStore = createNumTableStore<HistoryItem>({
  browserKey: HISTORY,
  commands: {
    save: "add_history",
    getAll: "get_history",
    update: "update_history",
    delete: "delete_history",
  },
  saveArgs: () => ({ timestamp: Date.now() }),
  browserWriteGuard: withQuotaGuard,
});

export const saveDraft = draftsStore.save;
export const getDrafts = draftsStore.getAll;
export const deleteDraft = draftsStore.remove;
export const updateDraft = draftsStore.update;

export const saveHistory = historyStore.save;
export const getHistory = historyStore.getAll;
export const updateHistory = historyStore.update;
export const deleteHistoryEntry = historyStore.remove;

/* ── Draft auto-folder headers/auth (localStorage, both builds — like environments'
   globals: a small keyed blob, not worth a Rust/SQLite table). Keyed by the
   deterministic host/path folder id `buildUrlTree` assigns, so config survives
   the draft tree being rebuilt fresh on every render. */

export function getDraftFolderConfigs(): Record<string, FolderConfig> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_FOLDER_CONFIGS_KEY) ?? "{}") as Record<
      string,
      FolderConfig
    >;
  } catch {
    return {};
  }
}

export function saveDraftFolderConfigs(configs: Record<string, FolderConfig>): void {
  localStorage.setItem(DRAFT_FOLDER_CONFIGS_KEY, JSON.stringify(configs));
}
