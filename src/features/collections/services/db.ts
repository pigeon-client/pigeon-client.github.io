import { invoke } from "@tauri-apps/api/core";
import type { Collection } from "../types";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function saveCollection(data: Collection): Promise<void> {
  if (!isTauri()) return;
  await invoke("save_collection", { id: data.id, data: JSON.stringify(data) });
}

export async function getCollections(): Promise<{ id: string; data: string }[]> {
  if (!isTauri()) return [];
  const rows: [string, string][] = await invoke("get_collections");
  return rows.map(([id, data]) => ({ id, data }));
}

export async function updateCollection(data: Collection): Promise<void> {
  if (!isTauri()) return;
  await invoke("update_collection", { id: data.id, data: JSON.stringify(data) });
}

export async function deleteCollection(id: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("delete_collection", { id });
}
