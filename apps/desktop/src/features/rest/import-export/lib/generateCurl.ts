import { methodAllowsRequestBody } from "@/shared/lib/httpMethod";
import { parseUrl, stripQuery } from "@/shared/lib/url";
import type { BodyType, RequestConfig } from "@/shared/types";

/** POSIX single-quote wrap — safe for bash/zsh/sh (no `$`/`"`/`` ` `` expansion). */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function hasHeader(headers: { key: string; enabled?: boolean }[], name: string): boolean {
  const lower = name.toLowerCase();
  return headers.some((h) => (h.enabled ?? true) && h.key.toLowerCase() === lower);
}

/** Body types that need an explicit Content-Type when not already set by the user. */
function contentTypeFor(bodyType: BodyType): string | null {
  if (bodyType === "none" || bodyType === "multipart/form-data") return null;
  return bodyType;
}

function isBinaryExportType(bodyType: BodyType): boolean {
  return (
    bodyType === "application/octet-stream" ||
    bodyType === "application/pdf" ||
    bodyType === "application/zip" ||
    bodyType.includes("protobuf") ||
    bodyType.includes("msgpack") ||
    bodyType.startsWith("image/") ||
    bodyType.startsWith("audio/") ||
    bodyType.startsWith("video/")
  );
}

/**
 * Build the URL the same way send does (params → query), without env interpolation
 * so exported curl keeps `{{var}}` literals when present.
 */
function buildUrl(config: RequestConfig): string {
  // RFC 9110 OPTIONS * — keep the asterisk request-target verbatim.
  if (config.url.trim() === "*") return "*";

  const activeParams = config.params?.filter((p) => p.enabled && p.key) ?? [];
  let url = parseUrl(activeParams.length > 0 ? stripQuery(config.url) : config.url);

  if (activeParams.length > 0) {
    const qs = activeParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join("&");
    url += `${url.includes("?") ? "&" : "?"}${qs}`;
  }

  if (
    config.auth.type === "api-key" &&
    config.auth.apiAddTo === "query" &&
    config.auth.apiKey &&
    config.auth.apiValue
  ) {
    url += `${url.includes("?") ? "&" : "?"}${encodeURIComponent(config.auth.apiKey)}=${encodeURIComponent(config.auth.apiValue)}`;
  }

  return url;
}

function hasExportableBody(config: RequestConfig): boolean {
  if (!methodAllowsRequestBody(config.method)) return false;
  if (config.bodyType === "multipart/form-data") {
    return config.multipart.some((f) => f.enabled && f.key);
  }
  if (config.bodyType === "application/x-www-form-urlencoded") {
    return config.formData.some((f) => f.enabled && f.key) || Boolean(config.body);
  }
  if (config.bodyType === "application/octet-stream" || isBinaryExportType(config.bodyType)) {
    return true;
  }
  return config.bodyType !== "none" && Boolean(config.body);
}

/**
 * Generate a standard, shell-safe cURL command from a request config.
 * Matches what the app actually sends (Content-Type, query params, auth).
 */
export function generateCurl(config: RequestConfig): string {
  const parts: string[] = ["curl"];
  const exportBody = hasExportableBody(config);

  // Always emit -X when the method is not curl's default GET, or when a body
  // would otherwise make curl imply POST. GET/HEAD never export a body
  // (RFC 9110), so a plain GET stays `curl 'url'`.
  if (config.method !== "GET") {
    parts.push("-X", config.method);
  }

  // Headers (enabled only)
  const headerArgs: string[] = [];
  for (const { key, value, enabled } of config.headers) {
    if (enabled && key) {
      headerArgs.push(`-H ${shellQuote(`${key}: ${value}`)}`);
    }
  }

  // Auth → headers / -u (same semantics as resolveRequest)
  if (config.auth.type === "basic" && config.auth.username) {
    parts.push("-u", shellQuote(`${config.auth.username}:${config.auth.password}`));
  } else if (config.auth.type === "bearer" && config.auth.token) {
    headerArgs.push(`-H ${shellQuote(`Authorization: Bearer ${config.auth.token}`)}`);
  } else if (
    config.auth.type === "api-key" &&
    config.auth.apiAddTo === "header" &&
    config.auth.apiKey &&
    config.auth.apiValue
  ) {
    headerArgs.push(`-H ${shellQuote(`${config.auth.apiKey}: ${config.auth.apiValue}`)}`);
  }

  // Auto Content-Type from body type (mirrors Rust send) — skip multipart (curl sets boundary)
  const ct = contentTypeFor(config.bodyType);
  if (
    exportBody &&
    ct &&
    config.bodyType !== "multipart/form-data" &&
    !hasHeader(config.headers, "Content-Type") &&
    (config.bodyType === "application/x-www-form-urlencoded"
      ? config.formData.some((f) => f.enabled && f.key)
      : Boolean(config.body) || isBinaryExportType(config.bodyType))
  ) {
    headerArgs.push(`-H ${shellQuote(`Content-Type: ${ct}`)}`);
  }

  parts.push(...headerArgs);

  // Body — never for GET/HEAD (matches send path + RFC 9110)
  if (exportBody) {
    if (config.bodyType === "multipart/form-data") {
      for (const field of config.multipart) {
        if (!(field.enabled && field.key)) continue;
        if (field.isFile) {
          const name = field.fileName || field.file?.name || "file";
          parts.push("-F", shellQuote(`${field.key}=@${name}`));
        } else {
          parts.push("-F", shellQuote(`${field.key}=${field.value}`));
        }
      }
    } else if (config.bodyType === "application/x-www-form-urlencoded") {
      const fields = config.formData.filter((f) => f.enabled && f.key);
      if (fields.length > 0) {
        for (const f of fields) {
          parts.push("--data-urlencode", shellQuote(`${f.key}=${f.value}`));
        }
      } else if (config.body) {
        parts.push("--data-raw", shellQuote(config.body));
      }
    } else if (isBinaryExportType(config.bodyType)) {
      // curl --data-binary @file — matches binary upload semantics (manpage).
      const name = config.file?.name || "file.bin";
      parts.push("--data-binary", shellQuote(`@${name}`));
    } else if (config.bodyType !== "none" && config.body) {
      parts.push("--data-raw", shellQuote(config.body));
    }
  }

  parts.push(shellQuote(buildUrl(config)));

  return parts.join(" ");
}
