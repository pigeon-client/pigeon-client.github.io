import { invoke } from "@tauri-apps/api/core";
import { numTable } from "@/shared/lib/browserTable";
import { isTauri } from "@/shared/lib/platform";
import type { RequestConfig } from "@/shared/types";
import type { HistoryItem } from "../types";

const DRAFTS = "pg_browser_drafts";
const HISTORY = "pg_browser_history";

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

export async function saveDraft(data: RequestConfig): Promise<number> {
  if (!isTauri()) return numTable.insert(DRAFTS, data);
  return invoke<number>("save_draft", { data: JSON.stringify(data) });
}

export async function getDrafts(): Promise<{ id: number; data: RequestConfig }[]> {
  if (!isTauri()) return numTable.all<RequestConfig>(DRAFTS);
  const rows: [number, string][] = await invoke("get_drafts");
  return rows.map(([id, json]) => ({ id, data: JSON.parse(json) as RequestConfig }));
}

export async function deleteDraft(id: number): Promise<void> {
  if (!isTauri()) return numTable.remove(DRAFTS, id);
  await invoke("delete_draft", { id });
}

export async function updateDraft(id: number, data: RequestConfig): Promise<void> {
  if (!isTauri()) return numTable.update(DRAFTS, id, data);
  await invoke("update_draft", { id, data: JSON.stringify(data) });
}

export async function saveHistory(item: HistoryItem): Promise<number> {
  if (!isTauri()) return withQuotaGuard(() => numTable.insert(HISTORY, item));
  return invoke<number>("add_history", { data: JSON.stringify(item), timestamp: Date.now() });
}

export async function getHistory(): Promise<{ id: number; data: HistoryItem }[]> {
  if (!isTauri()) return numTable.all<HistoryItem>(HISTORY);
  const rows: [number, string][] = await invoke("get_history");
  return rows.map(([id, json]) => ({ id, data: JSON.parse(json) as HistoryItem }));
}

export async function updateHistory(id: number, item: HistoryItem): Promise<void> {
  if (!isTauri()) return withQuotaGuard(() => numTable.update(HISTORY, id, item));
  await invoke("update_history", { id, data: JSON.stringify(item) });
}

export async function deleteHistoryEntry(id: number): Promise<void> {
  if (!isTauri()) return numTable.remove(HISTORY, id);
  await invoke("delete_history", { id });
}
