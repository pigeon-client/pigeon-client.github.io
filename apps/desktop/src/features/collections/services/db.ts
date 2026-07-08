import { invoke } from "@tauri-apps/api/core";
import { strTable } from "@/shared/lib/browserTable";
import { isTauri } from "@/shared/lib/platform";
import type { Collection } from "../types";

const KEY = "pg_browser_collections";

export async function saveCollection(data: Collection): Promise<void> {
  if (!isTauri()) {
    if (data.id) strTable.upsert(KEY, data.id, JSON.stringify(data));
    return;
  }
  await invoke("save_collection", { id: data.id, data: JSON.stringify(data) });
}

export async function getCollections(): Promise<{ id: string; data: string }[]> {
  if (!isTauri()) return strTable.all<string>(KEY);
  const rows: [string, string][] = await invoke("get_collections");
  return rows.map(([id, data]) => ({ id, data }));
}

export async function updateCollection(data: Collection): Promise<void> {
  if (!isTauri()) {
    if (data.id) strTable.upsert(KEY, data.id, JSON.stringify(data));
    return;
  }
  await invoke("update_collection", { id: data.id, data: JSON.stringify(data) });
}

export async function deleteCollection(id: string): Promise<void> {
  if (!isTauri()) {
    strTable.remove(KEY, id);
    return;
  }
  await invoke("delete_collection", { id });
}
