import { invoke } from "@tauri-apps/api/core";
import type { McpHttpResponse, McpTransport } from "../ports/McpTransport";

interface RustMcpResponse {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
}

/** Tauri transport — Rust `reqwest`, no CORS. See `send_mcp_request` in `src-tauri/src/lib.rs`. */
export const tauriMcpTransport: McpTransport = {
  async post(url, headers, bodyText): Promise<McpHttpResponse> {
    const res = await invoke<RustMcpResponse>("send_mcp_request", {
      url,
      headers: Object.entries(headers).map(([key, value]) => ({ key, value })),
      body: bodyText,
      // Honour the app-wide proxy/redirect settings (TLS verify stays always-on for MCP).
      followRedirects: localStorage.getItem("pg_follow_redirects") !== "false",
      proxyUrl: localStorage.getItem("pg_proxy_url") ?? "",
    });
    const lowered: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers)) lowered[k.toLowerCase()] = v;
    return { status: res.status, headers: lowered, bodyText: res.bodyText };
  },
};
