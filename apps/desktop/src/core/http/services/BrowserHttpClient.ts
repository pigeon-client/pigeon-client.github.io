import { contentTypeForBody } from "@/shared/lib/contentType";
import { methodAllowsRequestBody } from "@/shared/lib/httpMethod";
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
    if (request.url === "*") {
      throw new Error(
        "OPTIONS * cannot be sent from the browser transport — use the desktop app with a Host header",
      );
    }

    const headers: Record<string, string> = {};
    for (const h of request.headers) if (h.key) headers[h.key] = h.value;

    // Mirror Rust / curl: set Content-Type from body type when the user didn't.
    const hasCt = Object.keys(headers).some((k) => k.toLowerCase() === "content-type");
    const autoCt = contentTypeForBody(request.bodyType);
    if (!hasCt && autoCt && request.body != null) {
      headers["Content-Type"] = autoCt;
    }

    const method = request.method.toUpperCase();
    // RFC 9110: never send content on GET/HEAD (defense in depth; requestService
    // already strips, but keep the transport honest).
    const hasBody = request.body != null && methodAllowsRequestBody(method);

    // Binary body types arrive as comma-joined byte decimals from requestService.
    let body: BodyInit | undefined;
    if (hasBody && request.body != null) {
      if (request.body.includes(",") && /^\d+(,\d+)*$/.test(request.body.trim())) {
        const bytes = Uint8Array.from(
          request.body.split(",").map((s) => Number.parseInt(s.trim(), 10)),
        );
        body = bytes;
      } else {
        body = request.body;
      }
    }

    const res = await fetch(request.url, {
      method,
      headers,
      body,
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
