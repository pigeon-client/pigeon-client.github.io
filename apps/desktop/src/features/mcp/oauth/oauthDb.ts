import { invoke } from "@tauri-apps/api/core";
import { strTable } from "@/shared/lib/browserTable";
import { isTauri } from "@/shared/lib/platform";

const BROWSER_KEY = "pg_browser_mcp_oauth";

/** Persisted OAuth state for one MCP server, keyed by its canonical URI. */
export interface McpOauthRecord {
  serverUrl: string;
  authorizationServer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint?: string;
  clientId: string;
  clientSecret?: string;
  manualClientId: boolean;
  scope?: string;
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms; absent means the AS didn't report an expiry. */
  expiresAt?: number;
}

export async function saveMcpOauth(record: McpOauthRecord): Promise<void> {
  if (!isTauri()) {
    strTable.upsert(BROWSER_KEY, record.serverUrl, JSON.stringify(record));
    return;
  }
  await invoke("save_mcp_oauth", { serverUrl: record.serverUrl, data: JSON.stringify(record) });
}

export async function getMcpOauth(serverUrl: string): Promise<McpOauthRecord | null> {
  if (!isTauri()) {
    const row = strTable.all<string>(BROWSER_KEY).find((r) => r.id === serverUrl);
    return row ? (JSON.parse(row.data) as McpOauthRecord) : null;
  }
  const data = await invoke<string | null>("get_mcp_oauth", { serverUrl });
  return data ? (JSON.parse(data) as McpOauthRecord) : null;
}

export async function deleteMcpOauth(serverUrl: string): Promise<void> {
  if (!isTauri()) {
    strTable.remove(BROWSER_KEY, serverUrl);
    return;
  }
  await invoke("delete_mcp_oauth", { serverUrl });
}
