import {
  buildNotification,
  buildRequest,
  isJsonRpcError,
  parseJsonRpcMessage,
} from "../lib/jsonRpc";
import type { McpResource, McpTool } from "../lib/toolSchema";
import type { McpTransport } from "../ports/McpTransport";

const PROTOCOL_VERSION = "2025-03-26";
const SESSION_HEADER = "mcp-session-id";

/** Transport-level failure (couldn't reach the server at all). */
export class McpConnectError extends Error {}
/** Server reached but responded with a non-2xx or a JSON-RPC error object. */
export class McpProtocolError extends Error {}
/** Server responded 401 — carries `WWW-Authenticate` so the caller can run the OAuth flow. */
export class McpAuthRequiredError extends Error {
  constructor(public wwwAuthenticate: string | undefined) {
    super("MCP server requires authorization");
  }
}

/**
 * Minimal MCP Streamable-HTTP client: initialize → notifications/initialized →
 * tools/resources list → tools/call, tracking the session id automatically.
 * The frontend owns all JSON-RPC framing; `McpTransport` just moves bytes.
 */
export class McpSession {
  sessionId: string | undefined;
  private nextId = 1;

  constructor(
    private transport: McpTransport,
    private url: string,
    private headers: Record<string, string>,
  ) {}

  private async send(body: string): Promise<Awaited<ReturnType<McpTransport["post"]>>> {
    const headers = { ...this.headers };
    if (this.sessionId) headers[SESSION_HEADER] = this.sessionId;
    let res: Awaited<ReturnType<McpTransport["post"]>>;
    try {
      res = await this.transport.post(this.url, headers, body);
    } catch (e) {
      throw new McpConnectError(e instanceof Error ? e.message : String(e));
    }
    const sid = res.headers[SESSION_HEADER];
    if (sid) this.sessionId = sid;
    if (res.status === 401) {
      throw new McpAuthRequiredError(res.headers["www-authenticate"]);
    }
    if (res.status < 200 || res.status >= 300) {
      throw new McpProtocolError(`MCP server responded with HTTP ${res.status}`);
    }
    return res;
  }

  /** Merges a Bearer token into every subsequent request on this session. */
  setAuthorizationHeader(accessToken: string): void {
    this.headers = { ...this.headers, Authorization: `Bearer ${accessToken}` };
  }

  private async rpc(method: string, params?: unknown): Promise<unknown> {
    const id = this.nextId++;
    const res = await this.send(buildRequest(id, method, params));
    const message = parseJsonRpcMessage(res.bodyText);
    if (!message) {
      throw new McpProtocolError(`MCP server returned an unparseable response for "${method}"`);
    }
    if (isJsonRpcError(message)) {
      throw new McpProtocolError(message.error.message);
    }
    return message.result;
  }

  private async notify(method: string, params?: unknown): Promise<void> {
    await this.send(buildNotification(method, params));
  }

  async initialize(): Promise<void> {
    await this.rpc("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "Pigeon", version: "1.0" },
    });
    await this.notify("notifications/initialized");
  }

  async listTools(): Promise<McpTool[]> {
    const result = (await this.rpc("tools/list")) as { tools?: McpTool[] } | undefined;
    return result?.tools ?? [];
  }

  async listResources(): Promise<McpResource[]> {
    const result = (await this.rpc("resources/list")) as { resources?: McpResource[] } | undefined;
    return result?.resources ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.rpc("tools/call", { name, arguments: args });
  }
}
