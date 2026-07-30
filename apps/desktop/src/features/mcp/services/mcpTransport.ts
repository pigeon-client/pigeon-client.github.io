import { isTauri } from "@/shared/lib/platform";
import type { McpTransport } from "../ports/McpTransport";
import { browserMcpTransport } from "./BrowserMcpTransport";
import { tauriMcpTransport } from "./TauriMcpTransport";

/** Platform-selected transport, same seam pattern as `execution`'s `getHttpClient`. */
export function getMcpTransport(): McpTransport {
  return isTauri() ? tauriMcpTransport : browserMcpTransport;
}
