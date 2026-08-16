import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriIpcReady } from "./platform";

/**
 * Each workspace kind is a separate OS-level Tauri window (see `open_workspace_window`),
 * identified by its window label — "main" is REST; "mcp" and "graphql" are coming-soon
 * benches. Browser/E2E always resolves to "rest".
 */
export type WindowKind = "rest" | "mcp" | "graphql";

let cachedKind: WindowKind | undefined;

function resolveWindowKind(): WindowKind {
  if (!isTauriIpcReady()) return "rest";
  try {
    const label = getCurrentWindow().label;
    return label === "mcp" ? "mcp" : label === "graphql" ? "graphql" : "rest";
  } catch {
    return "rest";
  }
}

export function getWindowKind(): WindowKind {
  if (cachedKind) return cachedKind;
  cachedKind = resolveWindowKind();
  return cachedKind;
}

/** Re-resolve after Tauri IPC finishes bootstrapping (first paint may be too early). */
export function refreshWindowKind(): WindowKind {
  cachedKind = resolveWindowKind();
  return cachedKind;
}
