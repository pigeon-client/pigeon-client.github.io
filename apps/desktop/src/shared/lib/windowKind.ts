import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "./platform";

/**
 * Each workspace kind is a separate OS-level Tauri window (see `open_workspace_window` in
 * `src-tauri/src/lib.rs`), identified by its window label — "main" (the always-present default
 * window) is REST, "mcp" and "graphql" are their own windows. The plain browser/E2E build has no
 * separate windows at all, so it always resolves to "rest" and keeps the single-page,
 * mixed-kind-tabs experience.
 */
export type WindowKind = "rest" | "mcp" | "graphql";

function resolveWindowKind(): WindowKind {
  if (!isTauri()) return "rest";
  const label = getCurrentWindow().label;
  return label === "mcp" ? "mcp" : label === "graphql" ? "graphql" : "rest";
}

// The window label never changes mid-session — resolve once.
const windowKind = resolveWindowKind();

export function getWindowKind(): WindowKind {
  return windowKind;
}
