import { type Environment, replaceEnvVariables } from "@/features/environments";
import { parseUrl } from "@/shared/lib/url";
import type { RequestConfig } from "@/shared/types";
import type { ApiResponse } from "../types";
import { tauriHttpClient } from "./TauriHttpClient";

export interface SendOptions {
  followRedirects?: boolean;
  sslVerify?: boolean;
  proxyUrl?: string;
}

export interface ResolvedRequest {
  url: string;
  headers: { key: string; value: string }[];
  body: string | null;
}

export function resolveRequest(
  config: RequestConfig,
  activeEnv: Environment | null,
): ResolvedRequest {
  let url = parseUrl(config.url);
  url = replaceEnvVariables(url, activeEnv);

  const activeParams = config.params?.filter((p) => p.enabled && p.key) ?? [];
  if (activeParams.length > 0) {
    const separator = url.includes("?") ? "&" : "?";
    const queryString = activeParams
      .map(
        (p) =>
          `${encodeURIComponent(p.key)}=${encodeURIComponent(replaceEnvVariables(p.value, activeEnv))}`,
      )
      .join("&");
    url += separator + queryString;
  }

  const headers = config.headers
    .filter((h) => h.enabled && h.key)
    .map((h) => ({ key: h.key, value: replaceEnvVariables(h.value, activeEnv) }));

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

  return { url, headers, body: null };
}

export async function sendRequest(
  config: RequestConfig,
  activeEnv: Environment | null,
  options: SendOptions = {},
): Promise<ApiResponse> {
  const { followRedirects = true, sslVerify = true, proxyUrl = "" } = options;

  if (config.bodyType === "multipart/form-data") {
    return sendMultipartRequest(config, activeEnv);
  }

  const { url, headers } = resolveRequest(config, activeEnv);

  let body: string | null = null;
  if (config.bodyType === "application/json" && config.body) {
    body = replaceEnvVariables(config.body, activeEnv);
  } else if (config.bodyType === "text/plain" || config.bodyType === "text/xml") {
    body = replaceEnvVariables(config.body, activeEnv);
  } else if (config.bodyType === "application/x-www-form-urlencoded") {
    const params = new URLSearchParams();
    for (const f of config.formData.filter((f) => f.enabled && f.key)) {
      params.append(f.key, replaceEnvVariables(f.value, activeEnv));
    }
    body = params.toString();
  } else if (config.bodyType === "application/octet-stream" && config.file) {
    const arrayBuffer = await config.file.arrayBuffer();
    body = Array.from(new Uint8Array(arrayBuffer)).join(",");
  }

  const sentHeaders: Record<string, string> = Object.fromEntries(
    headers.map((h) => [h.key, h.value]),
  );
  const startTime = performance.now();

  try {
    const response = await tauriHttpClient.send({
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
  activeEnv: Environment | null,
): Promise<ApiResponse> {
  const { url, headers } = resolveRequest(config, activeEnv);
  const formData = new FormData();

  for (const field of config.multipart) {
    if (!(field.enabled && field.key)) continue;
    if (field.isFile && field.file) {
      formData.append(field.key, field.file);
    } else {
      formData.append(field.key, replaceEnvVariables(field.value, activeEnv));
    }
  }

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
