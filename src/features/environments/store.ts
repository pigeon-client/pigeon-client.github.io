import { create } from "zustand";
import * as db from "./services/db";
import type { Environment, EnvVariable } from "./types";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `env-${crypto.randomUUID()}`
    : `env-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface EnvState {
  environments: Environment[];
  activeEnvId: string | null;
  globals: EnvVariable[];
  loaded: boolean;

  load: () => Promise<void>;
  addEnvironment: (name: string) => Promise<string>;
  renameEnvironment: (id: string, name: string) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  duplicateEnvironment: (id: string) => Promise<string | null>;
  setVariables: (id: string, variables: EnvVariable[]) => Promise<void>;
  setProduction: (id: string, isProduction: boolean) => Promise<void>;
  setActive: (id: string | null) => void;
  setGlobals: (variables: EnvVariable[]) => void;
}

export const useEnvStore = create<EnvState>((set, get) => ({
  environments: [],
  activeEnvId: null,
  globals: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    const environments = await db.getEnvironments();
    const globals = db.getGlobals();
    let activeEnvId = db.getActiveEnvId();
    if (activeEnvId && !environments.some((e) => e.id === activeEnvId)) activeEnvId = null;
    set({ environments, globals, activeEnvId, loaded: true });
  },

  addEnvironment: async (name) => {
    const env: Environment = {
      id: newId(),
      name: name.trim() || "New Environment",
      isProduction: false,
      variables: [],
    };
    set((s) => ({ environments: [...s.environments, env] }));
    await db.saveEnvironment(env);
    return env.id;
  },

  renameEnvironment: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const env = get().environments.find((e) => e.id === id);
    if (!env) return;
    const updated = { ...env, name: trimmed };
    set((s) => ({ environments: s.environments.map((e) => (e.id === id ? updated : e)) }));
    await db.updateEnvironment(updated);
  },

  deleteEnvironment: async (id) => {
    set((s) => ({
      environments: s.environments.filter((e) => e.id !== id),
      activeEnvId: s.activeEnvId === id ? null : s.activeEnvId,
    }));
    if (db.getActiveEnvId() === id) db.setActiveEnvId(null);
    await db.deleteEnvironment(id);
  },

  duplicateEnvironment: async (id) => {
    const env = get().environments.find((e) => e.id === id);
    if (!env) return null;
    // Production flag is intentionally NOT copied (safer default — R5).
    const copy: Environment = {
      id: newId(),
      name: `${env.name} copy`,
      isProduction: false,
      variables: env.variables.map((v) => ({ ...v })),
    };
    set((s) => ({ environments: [...s.environments, copy] }));
    await db.saveEnvironment(copy);
    return copy.id;
  },

  setVariables: async (id, variables) => {
    const env = get().environments.find((e) => e.id === id);
    if (!env) return;
    const updated = { ...env, variables };
    set((s) => ({ environments: s.environments.map((e) => (e.id === id ? updated : e)) }));
    await db.updateEnvironment(updated);
  },

  setProduction: async (id, isProduction) => {
    const env = get().environments.find((e) => e.id === id);
    if (!env) return;
    const updated = { ...env, isProduction };
    set((s) => ({ environments: s.environments.map((e) => (e.id === id ? updated : e)) }));
    await db.updateEnvironment(updated);
  },

  setActive: (id) => {
    set({ activeEnvId: id });
    db.setActiveEnvId(id);
  },

  setGlobals: (variables) => {
    set({ globals: variables });
    db.saveGlobals(variables);
  },
}));

/** Derive the active environment object from the store state. */
export function selectActiveEnv(s: EnvState): Environment | null {
  return s.environments.find((e) => e.id === s.activeEnvId) ?? null;
}
