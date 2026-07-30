import type { McpHttpResponse, McpTransport } from "../ports/McpTransport";

/** Browser transport (dev server / Playwright) — plain `fetch`, same CORS caveats as BrowserHttpClient. */
export const browserMcpTransport: McpTransport = {
  async post(url, headers, bodyText): Promise<McpHttpResponse> {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...headers,
      },
      body: bodyText,
    });
    const respHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      respHeaders[key.toLowerCase()] = value;
    });
    return {
      status: res.status,
      headers: respHeaders,
      bodyText: await res.text(),
    };
  },
};
