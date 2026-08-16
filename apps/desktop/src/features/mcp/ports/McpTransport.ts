export interface McpHttpResponse {
  status: number;
  /** Lower-cased header names (matches `fetch`'s `Headers` iteration). */
  headers: Record<string, string>;
  bodyText: string;
  /** True when the native client cut the body at the 50 MiB cap. */
  truncated?: boolean;
}

/**
 * Transport seam for the MCP bench — mirrors `execution/ports/HttpClient`.
 * The frontend owns all JSON-RPC framing; this just POSTs bytes and returns
 * status/headers/body text so it's trivially stubbable in Playwright.
 */
export interface McpTransport {
  post(url: string, headers: Record<string, string>, bodyText: string): Promise<McpHttpResponse>;
}
