import { isTauri } from "@/shared/lib/platform";
import { resolveTemplate } from "@/shared/lib/template";
import { parseUrl, stripQuery } from "@/shared/lib/url";
import type { RequestConfig } from "@/shared/types";
import type { ApiResponse } from "../types";
import { browserHttpClient } from "./BrowserHttpClient";
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
  const { followRedirects = true, sslVerify = true, proxyUrl = "" } = options;

  if (config.bodyType === "multipart/form-data") {
    return sendMultipartRequest(config, resolve);
  }

  const missing = new Set<string>();
  const sub = (s: string): string => {
    const r = resolveTemplate(s, resolve);
    for (const m of r.missing) missing.add(m);
    return r.result;
  };

  const { url, headers, missing: reqMissing } = resolveRequest(config, resolve);
  for (const m of reqMissing) missing.add(m);

  let body: string | null = null;
  if (config.bodyType === "application/json" && config.body) {
    body = sub(config.body);
  } else if (config.bodyType === "text/plain" || config.bodyType === "text/xml") {
    body = sub(config.body);
  } else if (config.bodyType === "application/x-www-form-urlencoded") {
    const params = new URLSearchParams();
    for (const f of config.formData.filter((f) => f.enabled && f.key)) {
      params.append(f.key, sub(f.value));
    }
    body = params.toString();
  } else if (config.bodyType === "application/octet-stream" && config.file) {
    const arrayBuffer = await config.file.arrayBuffer();
    body = Array.from(new Uint8Array(arrayBuffer)).join(",");
  }

  // Strict: block the send if any variable was unresolved (R3b).
  if (missing.size > 0) throw new UnresolvedVariablesError([...missing]);

  const sentHeaders: Record<string, string> = Object.fromEntries(
    headers.map((h) => [h.key, h.value]),
  );
  const startTime = performance.now();

  try {
    const response = await httpClient.send({
      method: config.method,
      url,
      headers,
      body,
      bodyType: config.bodyType,
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

async function sendMultipartRequest(
  config: RequestConfig,
  resolve: Resolver,
): Promise<ApiResponse> {
  const { url, headers, missing: reqMissing } = resolveRequest(config, resolve);
  const missing = new Set(reqMissing);
  const formData = new FormData();

  for (const field of config.multipart) {
    if (!(field.enabled && field.key)) continue;
    if (field.isFile && field.file) {
      formData.append(field.key, field.file);
    } else {
      const r = resolveTemplate(field.value, resolve);
      for (const m of r.missing) missing.add(m);
      formData.append(field.key, r.result);
    }
  }

  if (missing.size > 0) throw new UnresolvedVariablesError([...missing]);

  const sentHeaders: Record<string, string> = Object.fromEntries(
    headers.map((h) => [h.key, h.value]),
  );
  const startTime = performance.now();

  try {
    const res = await fetch(url, {
      method: config.method,
      headers: sentHeaders,
      body: formData,
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
