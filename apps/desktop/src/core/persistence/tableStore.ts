import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/shared/lib/platform";
import { numTable, strTable } from "./browserTable";

interface NumTableCommands {
  save: string;
  getAll: string;
  update: string;
  delete: string;
}

interface NumTableStoreOptions {
  browserKey: string;
  commands: NumTableCommands;
  /** Extra invoke args merged into the save payload beyond `{ data }` (e.g. a server timestamp). */
  saveArgs?: () => Record<string, unknown>;
  /** Wraps the browser-path insert/update write (e.g. history's localStorage-quota retry). */
  browserWriteGuard?: <R>(write: () => R) => R;
}

/** Numeric-id table (drafts, history) — Tauri/SQLite in the app, localStorage in the browser build. */
export function createNumTableStore<T>(opts: NumTableStoreOptions) {
  const guard = opts.browserWriteGuard ?? (<R>(write: () => R) => write());

  return {
    async save(data: T): Promise<number> {
      if (!isTauri()) return guard(() => numTable.insert(opts.browserKey, data));
      return invoke<number>(opts.commands.save, {
        data: JSON.stringify(data),
        ...opts.saveArgs?.(),
      });
    },

    async getAll(): Promise<{ id: number; data: T }[]> {
      if (!isTauri()) return numTable.all<T>(opts.browserKey);
      const rows: [number, string][] = await invoke(opts.commands.getAll);
      return rows.map(([id, json]) => ({ id, data: JSON.parse(json) as T }));
    },

    async update(id: number, data: T): Promise<void> {
      if (!isTauri()) {
        guard(() => numTable.update(opts.browserKey, id, data));
        return;
      }
      await invoke(opts.commands.update, { id, data: JSON.stringify(data) });
    },

    async remove(id: number): Promise<void> {
      if (!isTauri()) {
        numTable.remove(opts.browserKey, id);
        return;
      }
      await invoke(opts.commands.delete, { id });
    },
  };
}

interface StrTableCommands {
  save: string;
  getAll: string;
  update: string;
  delete: string;
}

interface StrTableStoreOptions<T> {
  browserKey: string;
  /** Extracts the row id from a value being saved/updated (may be unset for a not-yet-persisted row). */
  getId: (data: T) => string | undefined;
  /** Omit for a browser-only table with no Rust-backed table (e.g. environments). */
  commands?: StrTableCommands;
}

/** String-id table (collections) — returns raw `{ id, data }` rows; callers own JSON parsing,
 *  matching the shape every current consumer already expects. */
export function createStrTableStore<T>(opts: StrTableStoreOptions<T>) {
  const tauriBacked = () => opts.commands !== undefined && isTauri();

  return {
    async save(data: T): Promise<void> {
      const id = opts.getId(data);
      if (!tauriBacked()) {
        if (id) strTable.upsert(opts.browserKey, id, JSON.stringify(data));
        return;
      }
      const commands = opts.commands as StrTableCommands;
      await invoke(commands.save, { id, data: JSON.stringify(data) });
    },

    async getAll(): Promise<{ id: string; data: string }[]> {
      if (!tauriBacked()) return strTable.all<string>(opts.browserKey);
      const commands = opts.commands as StrTableCommands;
      const rows: [string, string][] = await invoke(commands.getAll);
      return rows.map(([id, data]) => ({ id, data }));
    },

    async update(data: T): Promise<void> {
      const id = opts.getId(data);
      if (!tauriBacked()) {
        if (id) strTable.upsert(opts.browserKey, id, JSON.stringify(data));
        return;
      }
      const commands = opts.commands as StrTableCommands;
      await invoke(commands.update, { id, data: JSON.stringify(data) });
    },

    async remove(id: string): Promise<void> {
      if (!tauriBacked()) {
        strTable.remove(opts.browserKey, id);
        return;
      }
      const commands = opts.commands as StrTableCommands;
      await invoke(commands.delete, { id });
    },
  };
}

interface KeyValueCommands {
  save: string;
  get: string;
  delete: string;
}

interface KeyValueStoreOptions {
  browserKey: string;
  commands: KeyValueCommands;
  /** Tauri invoke arg name for the lookup key (matches the Rust command's param name). */
  keyArgName: string;
}

/** Key-value table (mcp_oauth) — single record per key, point lookup instead of a full list. */
export function createKeyValueStore<T>(opts: KeyValueStoreOptions) {
  return {
    async save(key: string, data: T): Promise<void> {
      if (!isTauri()) {
        strTable.upsert(opts.browserKey, key, JSON.stringify(data));
        return;
      }
      await invoke(opts.commands.save, { [opts.keyArgName]: key, data: JSON.stringify(data) });
    },

    async get(key: string): Promise<T | null> {
      if (!isTauri()) {
        const row = strTable.all<string>(opts.browserKey).find((r) => r.id === key);
        return row ? (JSON.parse(row.data) as T) : null;
      }
      const data = await invoke<string | null>(opts.commands.get, { [opts.keyArgName]: key });
      return data ? (JSON.parse(data) as T) : null;
    },

    async remove(key: string): Promise<void> {
      if (!isTauri()) {
        strTable.remove(opts.browserKey, key);
        return;
      }
      await invoke(opts.commands.delete, { [opts.keyArgName]: key });
    },
  };
}
