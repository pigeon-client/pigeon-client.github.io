import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "./platform";

/**
 * Each workspace kind is a separate OS-level Tauri window (see `open_workspace_window`),
 * identified by its window label — "main" is REST; "mcp" and "graphql" are coming-soon
 * benches. Browser/E2E always resolves to "rest".
 */
export type WindowKind = "rest" | "mcp" | "graphql";

function resolveWindowKind(): WindowKind {
  if (!isTauri()) return "rest";
  const label = getCurrentWindow().label;
  return label === "mcp" ? "mcp" : label === "graphql" ? "graphql" : "rest";
}

const windowKind = resolveWindowKind();

export function getWindowKind(): WindowKind {
  return windowKind;
}
