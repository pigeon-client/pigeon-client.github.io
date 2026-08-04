import { createKeyValueStore } from "@/core/persistence";

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

const store = createKeyValueStore<McpOauthRecord>({
  browserKey: "pg_browser_mcp_oauth",
  keyArgName: "serverUrl",
  commands: {
    save: "save_mcp_oauth",
    get: "get_mcp_oauth",
    delete: "delete_mcp_oauth",
  },
});

export async function saveMcpOauth(record: McpOauthRecord): Promise<void> {
  await store.save(record.serverUrl, record);
}

export async function getMcpOauth(serverUrl: string): Promise<McpOauthRecord | null> {
  return store.get(serverUrl);
}

export async function deleteMcpOauth(serverUrl: string): Promise<void> {
  await store.remove(serverUrl);
}
