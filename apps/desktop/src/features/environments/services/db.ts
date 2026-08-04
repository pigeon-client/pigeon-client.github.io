import { createStrTableStore } from "@/core/persistence";
import type { Environment, EnvVariable } from "../types";

const GLOBALS_KEY = "pg_globals";
const ACTIVE_KEY = "pg_active_env";

/* ── Environments ──
   Persisted to localStorage in both the desktop app and the browser build.
   The Tauri webview's localStorage survives restarts (stored in the app's data
   dir), so this needs no Rust/SQLite command and works without a rebuild. */

const store = createStrTableStore<Environment>({
  browserKey: "pg_browser_environments",
  getId: (data) => data.id,
});

export async function saveEnvironment(env: Environment): Promise<void> {
  await store.save(env);
}

export async function getEnvironments(): Promise<Environment[]> {
  const rows = await store.getAll();
  return rows.map((r) => JSON.parse(r.data) as Environment);
}

export async function updateEnvironment(env: Environment): Promise<void> {
  await store.update(env);
}

export async function deleteEnvironment(id: string): Promise<void> {
  await store.remove(id);
}

/* ── Globals + active id (localStorage, both builds — like pg_theme) ── */

export function getGlobals(): EnvVariable[] {
  try {
    return JSON.parse(localStorage.getItem(GLOBALS_KEY) ?? "[]") as EnvVariable[];
  } catch {
    return [];
  }
}

export function saveGlobals(vars: EnvVariable[]): void {
  localStorage.setItem(GLOBALS_KEY, JSON.stringify(vars));
}

export function getActiveEnvId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveEnvId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}
