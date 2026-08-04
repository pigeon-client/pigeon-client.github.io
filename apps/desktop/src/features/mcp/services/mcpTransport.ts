import { selectImpl } from "@/core/platform";
import type { McpTransport } from "../ports/McpTransport";
import { browserMcpTransport } from "./BrowserMcpTransport";
import { tauriMcpTransport } from "./TauriMcpTransport";

/** Platform-selected transport, same seam pattern as `core/http`'s `httpClient`. */
export function getMcpTransport(): McpTransport {
  return selectImpl({ tauri: tauriMcpTransport, browser: browserMcpTransport });
}
