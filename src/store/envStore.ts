import { create } from "zustand";
import type { Environment } from "../types";

interface EnvState {
  environments: Environment[];
  activeEnv: Environment | null;

  setEnvironments: (envs: Environment[]) => void;
  setActiveEnv: (env: Environment | null) => void;
  addEnvironment: (env: Omit<Environment, "id">) => void;
  updateEnvironment: (id: number, env: Partial<Environment>) => void;
  deleteEnvironment: (id: number) => void;
}

export const useEnvStore = create<EnvState>((set) => ({
  environments: [],
  activeEnv: null,

  setEnvironments: (environments) => set({ environments }),

  setActiveEnv: (activeEnv) => set({ activeEnv }),

  addEnvironment: (env) =>
    set((state) => ({
      environments: [...state.environments, { ...env, id: Date.now() }],
    })),

  updateEnvironment: (id, envUpdate) =>
    set((state) => ({
      environments: state.environments.map((e) => (e.id === id ? { ...e, ...envUpdate } : e)),
    })),

  deleteEnvironment: (id) =>
    set((state) => ({
      environments: state.environments.filter((e) => e.id !== id),
      activeEnv: state.activeEnv?.id === id ? null : state.activeEnv,
    })),
}));
