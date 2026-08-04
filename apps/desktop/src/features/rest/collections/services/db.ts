import { createStrTableStore } from "@/core/persistence";
import type { Collection } from "../types";

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

export const saveCollection = store.save;
export const getCollections = store.getAll;
export const updateCollection = store.update;
export const deleteCollection = store.remove;
