import { strTable } from "@/shared/lib/browserTable";
import type { Environment, EnvVariable } from "../types";

const KEY = "pg_browser_environments";
const GLOBALS_KEY = "pg_globals";
const ACTIVE_KEY = "pg_active_env";

/* ── Environments ──
   Persisted to localStorage in both the desktop app and the browser build.
   The Tauri webview's localStorage survives restarts (stored in the app's data
   dir), so this needs no Rust/SQLite command and works without a rebuild. */

export async function saveEnvironment(env: Environment): Promise<void> {
  strTable.upsert(KEY, env.id, JSON.stringify(env));
}

export async function getEnvironments(): Promise<Environment[]> {
  return strTable.all<string>(KEY).map((r) => JSON.parse(r.data) as Environment);
}

export async function updateEnvironment(env: Environment): Promise<void> {
  strTable.upsert(KEY, env.id, JSON.stringify(env));
}

export async function deleteEnvironment(id: string): Promise<void> {
  strTable.remove(KEY, id);
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
