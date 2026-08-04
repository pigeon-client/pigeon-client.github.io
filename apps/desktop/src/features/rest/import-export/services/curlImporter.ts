import { type JSONOutput, toJsonObject } from "curlconverter";
import type {
  Body,
  Cookie,
  FormField,
  ImportedHeader,
  QueryParam,
  RequestModel,
} from "../model/RequestModel";

function randomId(): string {
  return crypto.randomUUID();
}

function normalizeHeaderEntries(headers: JSONOutput["headers"] = {}): ImportedHeader[] {
  return Object.entries(headers)
    .filter(([, value]) => value != null)
    .map(([key, value]) => ({ key, value: String(value), enabled: true }));
}

function getHeader(headers: ImportedHeader[], name: string): string {
  return headers.find((header) => header.key.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseUrlParts(raw: string, fallback: string): RequestModel["url"] {
  const rawUrl = raw || fallback;
  try {
    const parsed = new URL(rawUrl);
    return {
      raw: rawUrl,
      protocol: parsed.protocol.replace(":", "") || undefined,
      host: parsed.hostname || undefined,
      port: parsed.port ? Number(parsed.port) : undefined,
      path: parsed.pathname.split("/").filter(Boolean),
      query: [...parsed.searchParams.entries()].map(([key, value]) => ({
        key,
        value,
        enabled: true,
      })),
    };
  } catch {
    return {
      raw: rawUrl,
      path: [],
      query: [],
    };
  }
}

function parseQueries(queries: JSONOutput["queries"] = {}): QueryParam[] {
  return Object.entries(queries).flatMap(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.map((v) => ({ key, value: String(v), enabled: true }));
  });
}

function parseCookies(parsed: JSONOutput, headers: ImportedHeader[]): Cookie[] {
  if (parsed.cookies) {
    return Object.entries(parsed.cookies).map(([key, value]) => ({ key, value }));
  }

  const cookieHeader = getHeader(headers, "cookie");
  if (!cookieHeader) return [];

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const equalsIndex = cookie.indexOf("=");
      if (equalsIndex === -1) return { key: cookie, value: "" };
      return {
        key: cookie.slice(0, equalsIndex).trim(),
        value: cookie.slice(equalsIndex + 1).trim(),
      };
    });
}

function parseAuth(parsed: JSONOutput, headers: ImportedHeader[]): RequestModel["auth"] {
  if (parsed.auth) {
    return {
      type: "basic",
      username: parsed.auth.user,
      password: parsed.auth.password,
    };
  }

  const authHeader = getHeader(headers, "authorization");
  if (!authHeader) return { type: "none" };

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      type: "bearer",
      token: authHeader.slice("bearer ".length).trim(),
    };
  }

  return { type: "none" };
}

function hasContentType(headers: ImportedHeader[], value: string): boolean {
  return getHeader(headers, "content-type").toLowerCase().includes(value);
}

function objectToFields(data: Record<string, string> | undefined): FormField[] {
  return Object.entries(data ?? {}).map(([key, value]) => ({
    key,
    value: String(value),
    type: "text",
    enabled: true,
  }));
}

function parseBody(parsed: JSONOutput, headers: ImportedHeader[]): Body {
  const hasData = parsed.data != null;
  const hasFiles = parsed.files != null && Object.keys(parsed.files).length > 0;

  if (!(hasData || hasFiles)) return { mode: "none" };

  if (hasFiles) {
    return {
      mode: "form-data",
      formData: [
        ...objectToFields(
          typeof parsed.data === "object" && parsed.data !== null ? parsed.data : undefined,
        ),
        ...Object.entries(parsed.files ?? {}).map(([key, file]) => ({
          key,
          file,
          type: "file" as const,
          enabled: true,
        })),
      ],
    };
  }

  if (hasContentType(headers, "application/json") && !hasContentType(headers, "ndjson")) {
    return {
      mode: "json",
      raw: typeof parsed.data === "string" ? parsed.data : JSON.stringify(parsed.data, null, 2),
    };
  }

  if (
    hasContentType(headers, "application/x-www-form-urlencoded") &&
    typeof parsed.data === "object" &&
    parsed.data !== null
  ) {
    return {
      mode: "urlencoded",
      urlEncoded: objectToFields(parsed.data),
    };
  }

  // Binary media types (PDF, ZIP, protobuf, images, audio, video, …)
  const ct = getHeader(headers, "content-type").toLowerCase();
  if (
    ct.includes("octet-stream") ||
    ct.includes("protobuf") ||
    ct.includes("msgpack") ||
    ct.startsWith("image/") ||
    ct.startsWith("audio/") ||
    ct.startsWith("video/") ||
    ct.includes("application/pdf") ||
    ct.includes("application/zip")
  ) {
    return {
      mode: "binary",
      raw: typeof parsed.data === "string" ? parsed.data : undefined,
    };
  }

  return {
    mode: "raw",
    raw: typeof parsed.data === "string" ? parsed.data : JSON.stringify(parsed.data, null, 2),
  };
}

function parseOptions(parsed: JSONOutput, input: string): RequestModel["options"] {
  const hasInsecureFlag = /(^|\s)(-k|--insecure)(\s|$)/.test(input);
  return {
    followRedirects: parsed.follow_redirects ?? false,
    compressed: parsed.compressed ?? false,
    insecure: hasInsecureFlag || parsed.insecure === true,
    timeout: parsed.timeout,
    connectTimeout: parsed.connect_timeout,
    proxy: parsed.proxy,
  };
}

export function importCurl(input: string): RequestModel | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const parsed = toJsonObject(trimmed);
    if (!parsed?.url) return null;

    const headers = normalizeHeaderEntries(parsed.headers);
    const url = parseUrlParts(parsed.raw_url ?? parsed.url, parsed.url);
    const queries = parseQueries(parsed.queries);

    return {
      id: randomId(),
      method: parsed.method ?? "GET",
      url: {
        ...url,
        query: queries.length > 0 ? queries : url.query,
      },
      headers,
      cookies: parseCookies(parsed, headers),
      auth: parseAuth(parsed, headers),
      body: parseBody(parsed, headers),
      options: parseOptions(parsed, trimmed),
    };
  } catch {
    return null;
  }
}
