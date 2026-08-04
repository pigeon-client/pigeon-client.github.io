const KEY = "pg_history_retention_days";

export type RetentionDays = 30 | 90 | 365 | null;

const VALID: RetentionDays[] = [30, 90, 365, null];

export const DEFAULT_RETENTION_DAYS: RetentionDays = 90;

export const RETENTION_OPTIONS: { value: RetentionDays; label: string }[] = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
  { value: null, label: "Forever" },
];

/** Persisted retention window; `null` means keep forever. Desktop-only setting — the
 *  browser build relies on the raised numeric caps instead (see trimForBrowser). */
export function getRetentionDays(): RetentionDays {
  if (typeof localStorage === "undefined") return DEFAULT_RETENTION_DAYS;
  const raw = localStorage.getItem(KEY);
  if (raw === "forever") return null;
  const n = Number(raw);
  return VALID.includes(n as RetentionDays) ? (n as RetentionDays) : DEFAULT_RETENTION_DAYS;
}

export function setRetentionDays(days: RetentionDays): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, days === null ? "forever" : String(days));
}

export function isStale(
  timestamp: number,
  retentionDays: RetentionDays,
  now = Date.now(),
): boolean {
  if (retentionDays === null) return false;
  return now - timestamp > retentionDays * 24 * 60 * 60 * 1000;
}

/** Split by the retention window. Pure — used for the app-start prune and unit-tested directly. */
export function partitionByRetention<T extends { timestamp: number }>(
  items: T[],
  retentionDays: RetentionDays,
  now = Date.now(),
): { kept: T[]; pruned: T[] } {
  const kept: T[] = [];
  const pruned: T[] = [];
  for (const item of items) {
    (isStale(item.timestamp, retentionDays, now) ? pruned : kept).push(item);
  }
  return { kept, pruned };
}
