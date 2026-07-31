import { isTauri } from "@/shared/lib/platform";

export interface MigrationStatus {
  fromVersion: number;
  toVersion: number;
}

/**
 * Reads the one-shot migration result recorded by the Rust side during this
 * launch's `init_db()` — schema migrations run synchronously before the
 * window opens, so by the time the frontend asks, they've already finished.
 * Returns null when no migration ran (fresh install, already up to date, or
 * the browser build with no SQLite backend).
 */
export async function getMigrationStatus(): Promise<MigrationStatus | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<MigrationStatus | null>("get_migration_status");
  } catch {
    return null;
  }
}
