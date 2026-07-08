import type { HttpClient, HttpRequest } from "../ports/HttpClient";
import type { ApiResponse } from "../types";

/**
 * Browser transport used when there is no Tauri backend (dev server / Playwright).
 * Uses `fetch`, so it is subject to CORS for real cross-origin APIs — E2E tests
 * stub the network with Playwright route mocks. `sslVerify` / `proxyUrl` have no
 * browser equivalent and are ignored.
 */
export const browserHttpClient: HttpClient = {
  async send(request: HttpRequest): Promise<ApiResponse> {
    const headers: Record<string, string> = {};
    for (const h of request.headers) if (h.key) headers[h.key] = h.value;

    const method = request.method.toUpperCase();
    const hasBody = request.body != null && method !== "GET" && method !== "HEAD";

    const res = await fetch(request.url, {
      method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: request.followRedirects ? "follow" : "manual",
    });

    const bytes = new Uint8Array(await res.arrayBuffer());
    const respHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      respHeaders[key] = value;
    });

    return {
      status: res.status,
      statusText: res.statusText,
      headers: respHeaders,
      body: Array.from(bytes),
      contentType: respHeaders["content-type"] ?? "application/octet-stream",
      responseTime: 0,
      size: bytes.length,
      resolvedUrl: request.url,
    };
  },
};
