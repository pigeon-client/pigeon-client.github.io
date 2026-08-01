import { useCallback } from "react";
import { create } from "zustand";
import type { McpResource, McpTool } from "./lib/toolSchema";
import type { McpSession } from "./services/McpSession";

export type McpConnectStatus = "idle" | "connecting" | "connected" | "error" | "auth-required";

/**
 * Per-tab MCP connection state, shared between `McpPanel` (connect form, auth flow, selected-tool
 * form/call/result) and `McpSidebar` (tools/resources list, disconnect/forget-authorization) —
 * they're siblings, not parent/child, so this can't just be component-local `useState` once the
 * tools list moves into the sidebar. Keyed by tab id; each MCP tab gets its own isolated entry.
 */
export interface McpTabState {
  status: McpConnectStatus;
  connectError: string | null;
  session: McpSession | null;
  tools: McpTool[];
  resources: McpResource[];
  selectedTool: string | null;
  argValues: Record<string, string>;
  rawArgsJson: string;
  calling: boolean;
  callError: string | null;
  callResult: unknown;
  callTimeMs: number | null;
  rawView: boolean;
  authorizedServerUrl: string | null;
}

const DEFAULT_TAB_STATE: McpTabState = {
  status: "idle",
  connectError: null,
  session: null,
  tools: [],
  resources: [],
  selectedTool: null,
  argValues: {},
  rawArgsJson: "{}",
  calling: false,
  callError: null,
  callResult: undefined,
  callTimeMs: null,
  rawView: false,
  authorizedServerUrl: null,
};

interface McpStoreState {
  byTab: Record<string, McpTabState>;
  patchTab: (tabId: string, patch: Partial<McpTabState>) => void;
  removeTab: (tabId: string) => void;
}

export const useMcpStore = create<McpStoreState>((set) => ({
  byTab: {},
  patchTab: (tabId, patch) =>
    set((s) => ({
      byTab: {
        ...s.byTab,
        [tabId]: { ...(s.byTab[tabId] ?? DEFAULT_TAB_STATE), ...patch },
      },
    })),
  removeTab: (tabId) =>
    set((s) => {
      const rest = { ...s.byTab };
      delete rest[tabId];
      return { byTab: rest };
    }),
}));

/** Convenience hook: this tab's state plus bound patch/remove actions. */
export function useMcpTab(tabId: string) {
  const state = useMcpStore((s) => s.byTab[tabId] ?? DEFAULT_TAB_STATE);
  const patchTab = useMcpStore((s) => s.patchTab);
  const removeTab = useMcpStore((s) => s.removeTab);
  // Stable identities across renders — consumers rely on this for effect deps
  // (e.g. an unmount-only cleanup effect calling `remove`).
  const patch = useCallback((p: Partial<McpTabState>) => patchTab(tabId, p), [patchTab, tabId]);
  const remove = useCallback(() => removeTab(tabId), [removeTab, tabId]);
  return {
    state,
    patch,
    remove,
  };
}
