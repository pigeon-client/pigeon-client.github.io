import { invoke } from "@tauri-apps/api/core";
import { createStrTableStore } from "@/core/persistence";
import { waitForTauriIpc } from "@/shared/lib/platform";
import type { Collection, FolderConfig } from "../types";

const store = createStrTableStore<Collection>({
  browserKey: "pg_browser_collections",
  getId: (data) => data.id,
  commands: {
    save: "save_collection",
    getAll: "get_collections",
    update: "update_collection",
    delete: "delete_collection",
  },
});

/** Last serialized payload per collection — skip no-op tree writes. */
const lastJson = new Map<string, string>();

function serialized(collection: Collection): string {
  return JSON.stringify(collection);
}

export async function saveCollection(collection: Collection): Promise<void> {
  if (collection.id) lastJson.set(collection.id, serialized(collection));
  await store.save(collection);
}

export const getCollections = store.getAll;

export async function updateCollection(collection: Collection): Promise<void> {
  if (collection.id) {
    const json = serialized(collection);
    if (lastJson.get(collection.id) === json) return;
    lastJson.set(collection.id, json);
  }
  await store.update(collection);
}

export async function deleteCollection(id: string): Promise<void> {
  lastJson.delete(id);
  await store.remove(id);
}

export async function patchCollectionName(id: string, name: string): Promise<void> {
  if (await waitForTauriIpc()) {
    await invoke("patch_collection_name", { id, name });
    lastJson.delete(id);
    return;
  }
  const rows = await store.getAll();
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  const data = JSON.parse(row.data) as Collection;
  await updateCollection({ ...data, id, name });
}

export async function patchCollectionConfig(id: string, config: FolderConfig): Promise<void> {
  if (await waitForTauriIpc()) {
    await invoke("patch_collection_config", { id, config: JSON.stringify(config) });
    lastJson.delete(id);
    return;
  }
  const rows = await store.getAll();
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  const data = JSON.parse(row.data) as Collection;
  await updateCollection({ ...data, id, config });
}
