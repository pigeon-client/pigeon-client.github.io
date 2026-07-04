import { invoke } from "@tauri-apps/api/core";
import type { RequestConfig } from "@/shared/types";
import type { HistoryItem } from "../types";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function saveDraft(data: RequestConfig): Promise<number> {
  if (!isTauri()) return -1;
  return invoke<number>("save_draft", { data: JSON.stringify(data) });
}

export async function getDrafts(): Promise<{ id: number; data: RequestConfig }[]> {
  if (!isTauri()) return [];
  const rows: [number, string][] = await invoke("get_drafts");
  return rows.map(([id, json]) => ({ id, data: JSON.parse(json) as RequestConfig }));
}

export async function deleteDraft(id: number): Promise<void> {
  if (!isTauri()) return;
  await invoke("delete_draft", { id });
}

export async function updateDraft(id: number, data: RequestConfig): Promise<void> {
  if (!isTauri()) return;
  await invoke("update_draft", { id, data: JSON.stringify(data) });
}

export async function saveHistory(item: HistoryItem): Promise<number> {
  if (!isTauri()) return -1;
  return invoke<number>("add_history", { data: JSON.stringify(item), timestamp: Date.now() });
}

export async function getHistory(): Promise<{ id: number; data: HistoryItem }[]> {
  if (!isTauri()) return [];
  const rows: [number, string][] = await invoke("get_history");
  return rows.map(([id, json]) => ({ id, data: JSON.parse(json) as HistoryItem }));
}

export async function updateHistory(id: number, item: HistoryItem): Promise<void> {
  if (!isTauri()) return;
  await invoke("update_history", { id, data: JSON.stringify(item) });
}

export async function deleteHistoryEntry(id: number): Promise<void> {
  if (!isTauri()) return;
  await invoke("delete_history", { id });
}
