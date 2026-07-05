/**
 * Tiny localStorage-backed table used by the browser DB adapters (dev server /
 * Playwright). Each table is a JSON array of `{ id, data }` rows. Ids are
 * numeric and auto-incremented per table; string-keyed tables (collections)
 * use their own id and just upsert.
 */

interface Row<TId, TData> {
  id: TId;
  data: TData;
}

function read<TId, TData>(key: string): Row<TId, TData>[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Row<TId, TData>[]) : [];
  } catch {
    return [];
  }
}

function write<TId, TData>(key: string, rows: Row<TId, TData>[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(rows));
}

/** Numeric-id table (drafts, history). Returns new ids on insert. */
export const numTable = {
  all<T>(key: string): { id: number; data: T }[] {
    return read<number, T>(key);
  },
  insert<T>(key: string, data: T): number {
    const rows = read<number, T>(key);
    const id = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    rows.push({ id, data });
    write(key, rows);
    return id;
  },
  update<T>(key: string, id: number, data: T): void {
    const rows = read<number, T>(key);
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) {
      rows[i] = { id, data };
      write(key, rows);
    }
  },
  remove(key: string, id: number): void {
    write(
      key,
      read(key).filter((r) => r.id !== id),
    );
  },
};

/** String-id table (collections). Upsert by id. */
export const strTable = {
  all<T>(key: string): { id: string; data: T }[] {
    return read<string, T>(key);
  },
  upsert<T>(key: string, id: string, data: T): void {
    const rows = read<string, T>(key);
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) rows[i] = { id, data };
    else rows.push({ id, data });
    write(key, rows);
  },
  remove(key: string, id: string): void {
    write(
      key,
      read<string, unknown>(key).filter((r) => r.id !== id),
    );
  },
};
