import { isBinaryBodyType, isTextualBodyType } from "@/shared/lib/contentType";
import { methodAllowsRequestBody } from "@/shared/lib/httpMethod";
import { isTauri } from "@/shared/lib/platform";
import { resolveTemplate } from "@/shared/lib/template";
import { parseUrl, stripQuery } from "@/shared/lib/url";
import type { RequestConfig } from "@/shared/types";
import type { SseEvent, SseMeta } from "../lib/sse";
import type { ApiResponse } from "../types";
import { browserHttpClient } from "./BrowserHttpClient";
import { sendMaybeSse } from "./sseClient";
import { tauriHttpClient } from "./TauriHttpClient";

/** Rust transport in the app; fetch-based transport in a plain browser. */
const httpClient = isTauri() ? tauriHttpClient : browserHttpClient;

/** Resolves a `{{token}}` name to a value (env → globals; $-random handled by
    resolveTemplate). Undefined means the variable is missing → send blocked. */
export type Resolver = (name: string) => string | undefined;

/** Thrown before dispatch when any `{{token}}` can't be resolved (R3b). */
export class UnresolvedVariablesError extends Error {
  variables: string[];
  constructor(variables: string[]) {
    super(`Unresolved variable${variables.length > 1 ? "s" : ""}: ${variables.join(", ")}`);
    this.name = "UnresolvedVariablesError";
    this.variables = variables;
  }
}

export interface SendOptions {
  followRedirects?: boolean;
  sslVerify?: boolean;
  proxyUrl?: string;
  /** When set, response may stream as SSE (`text/event-stream`). */
  streamId?: string;
  signal?: AbortSignal;
  onSseMeta?: (meta: SseMeta) => void;
  onSseEvent?: (event: SseEvent) => void;
}

export interface ResolvedRequest {
  url: string;
  headers: { key: string; value: string }[];
  missing: string[];
}

export function resolveRequest(config: RequestConfig, resolve: Resolver): ResolvedRequest {
  const missing = new Set<string>();
  const sub = (s: string): string => {
    const r = resolveTemplate(s, resolve);
    for (const m of r.missing) missing.add(m);
    return r.result;
  };

  // RFC 9110 OPTIONS * — leave the asterisk request-target alone.
  if (config.url.trim() === "*") {
    const headers = config.headers
      .filter((h) => h.enabled && h.key)
      .map((h) => ({ key: h.key, value: sub(h.value) }));
    return { url: "*", headers, missing: [...missing] };
  }

  const activeParams = config.params?.filter((p) => p.enabled && p.key) ?? [];
  // Params mirror the URL's query, so drop the URL query when params exist to
  // avoid sending it twice; keep the URL as typed when there are no params.
  let url = parseUrl(activeParams.length > 0 ? stripQuery(config.url) : config.url);
  url = sub(url);

  if (activeParams.length > 0) {
    const separator = url.includes("?") ? "&" : "?";
    const queryString = activeParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(sub(p.value))}`)
      .join("&");
    url += separator + queryString;
  }

  const headers = config.headers
    .filter((h) => h.enabled && h.key)
    .map((h) => ({ key: h.key, value: sub(h.value) }));

  if (config.auth.type === "basic" && config.auth.username) {
    const encoded = btoa(`${config.auth.username}:${config.auth.password}`);
    headers.push({ key: "Authorization", value: `Basic ${encoded}` });
  } else if (config.auth.type === "bearer" && config.auth.token) {
    headers.push({ key: "Authorization", value: `Bearer ${config.auth.token}` });
  } else if (config.auth.type === "api-key" && config.auth.apiKey && config.auth.apiValue) {
    if (config.auth.apiAddTo === "header") {
      headers.push({ key: config.auth.apiKey, value: config.auth.apiValue });
    } else {
      const separator = url.includes("?") ? "&" : "?";
      url += `${separator}${encodeURIComponent(config.auth.apiKey)}=${encodeURIComponent(config.auth.apiValue)}`;
    }
  }

  return { url, headers, missing: [...missing] };
}

export async function sendRequest(
  config: RequestConfig,
  resolve: Resolver,
  options: SendOptions = {},
): Promise<ApiResponse> {
  const {
    followRedirects = true,
    sslVerify = true,
    proxyUrl = "",
    streamId,
    signal,
    onSseMeta,
    onSseEvent,
  } = options;

  if (config.bodyType === "multipart/form-data") {
    return sendMultipartRequest(config, resolve, options);
  }

  const missing = new Set<string>();
  const sub = (s: string): string => {
    const r = resolveTemplate(s, resolve);
    for (const m of r.missing) missing.add(m);
    return r.result;
  };

  const { url, headers, missing: reqMissing } = resolveRequest(config, resolve);
  for (const m of reqMissing) missing.add(m);

  // RFC 9110: GET/HEAD request content has no defined semantics — never send it.
  let body: string | null = null;
  if (methodAllowsRequestBody(config.method)) {
    if (config.bodyType === "application/x-www-form-urlencoded") {
      const params = new URLSearchParams();
      for (const f of config.formData.filter((f) => f.enabled && f.key)) {
        params.append(f.key, sub(f.value));
      }
      body = params.toString();
    } else if (isBinaryBodyType(config.bodyType) && config.file) {
      const arrayBuffer = await config.file.arrayBuffer();
      body = Array.from(new Uint8Array(arrayBuffer)).join(",");
    } else if (isTextualBodyType(config.bodyType) && config.body) {
      body = sub(config.body);
    }
  }

  // Strict: block the send if any variable was unresolved (R3b).
  if (missing.size > 0) throw new UnresolvedVariablesError([...missing]);

  const sentHeaders: Record<string, string> = Object.fromEntries(
    headers.map((h) => [h.key, h.value]),
  );
  const startTime = performance.now();

  const httpReq = {
    method: config.method,
    url,
    headers,
    body,
    bodyType: config.bodyType,
    followRedirects,
    sslVerify,
    proxyUrl,
  };

  try {
    const response = streamId
      ? await sendMaybeSse(httpReq, streamId, { onMeta: onSseMeta, onEvent: onSseEvent }, signal)
      : await httpClient.send(httpReq);

    return {
      ...response,
      responseTime: Math.round(performance.now() - startTime),
      resolvedUrl: url,
      sentHeaders,
    };
  } catch (e) {
    return {
      status: 0,
      statusText: String(e),
      headers: {},
      body: [],
      contentType: "text/plain",
      responseTime: Math.round(performance.now() - startTime),
      size: 0,
      resolvedUrl: url,
      sentHeaders,
    };
  }
}

/** Wire format for multipart fields sent through the Tauri/Rust transport. */
interface MultipartFieldPayload {
  key: string;
  text?: string;
  fileName?: string;
  mime?: string;
  bytes?: number[];
}

async function sendMultipartRequest(
  config: RequestConfig,
  resolve: Resolver,
  options: SendOptions = {},
): Promise<ApiResponse> {
  const { followRedirects = true, sslVerify = true, proxyUrl = "" } = options;
  const { url, headers, missing: reqMissing } = resolveRequest(config, resolve);
  const missing = new Set(reqMissing);
  const sub = (s: string): string => {
    const r = resolveTemplate(s, resolve);
    for (const m of r.missing) missing.add(m);
    return r.result;
  };

  if (!methodAllowsRequestBody(config.method)) {
    // Multipart is a body — refuse for GET/HEAD rather than silently dropping fields.
    throw new Error(`${config.method} must not include a request body (RFC 9110)`);
  }

  const sentHeaders: Record<string, string> = Object.fromEntries(
    headers.map((h) => [h.key, h.value]),
  );
  const startTime = performance.now();

  // Desktop: send through Rust so redirect / SSL / proxy settings apply.
  if (isTauri()) {
    const fields: MultipartFieldPayload[] = [];
    for (const field of config.multipart) {
      if (!(field.enabled && field.key)) continue;
      if (field.isFile && field.file) {
        const buf = new Uint8Array(await field.file.arrayBuffer());
        fields.push({
          key: field.key,
          fileName: field.file.name,
          mime: field.file.type || "application/octet-stream",
          bytes: Array.from(buf),
        });
      } else {
        fields.push({ key: field.key, text: sub(field.value) });
      }
    }
    if (missing.size > 0) throw new UnresolvedVariablesError([...missing]);

    try {
      const response = await httpClient.send({
        method: config.method,
        url,
        headers,
        body: JSON.stringify(fields),
        bodyType: "multipart/form-data",
        followRedirects,
        sslVerify,
        proxyUrl,
      });
      return {
        ...response,
        responseTime: Math.round(performance.now() - startTime),
        resolvedUrl: url,
        sentHeaders,
      };
    } catch (err) {
      return {
        status: 0,
        statusText: String(err),
        headers: {},
        body: [],
        contentType: "text/plain",
        responseTime: Math.round(performance.now() - startTime),
        size: 0,
        resolvedUrl: url,
        sentHeaders,
      };
    }
  }

  // Browser: FormData + fetch (no SSL/proxy knobs; honor redirect setting).
  const formData = new FormData();
  for (const field of config.multipart) {
    if (!(field.enabled && field.key)) continue;
    if (field.isFile && field.file) {
      formData.append(field.key, field.file);
    } else {
      formData.append(field.key, sub(field.value));
    }
  }
  if (missing.size > 0) throw new UnresolvedVariablesError([...missing]);

  try {
    const res = await fetch(url, {
      method: config.method,
      headers: sentHeaders,
      body: formData,
      redirect: followRedirects ? "follow" : "manual",
    });

    const bodyBytes = new Uint8Array(await res.arrayBuffer());
    const respHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      respHeaders[key] = value;
    });

    return {
      status: res.status,
      statusText: res.statusText,
      headers: respHeaders,
      body: Array.from(bodyBytes),
      contentType: respHeaders["content-type"] ?? "application/octet-stream",
      responseTime: Math.round(performance.now() - startTime),
      size: bodyBytes.length,
      resolvedUrl: url,
      sentHeaders,
    };
  } catch (err) {
    return {
      status: 0,
      statusText: String(err),
      headers: {},
      body: [],
      contentType: "text/plain",
      responseTime: 0,
      size: 0,
      resolvedUrl: url,
      sentHeaders,
    };
  }
}
