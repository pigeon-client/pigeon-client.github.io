import { toJsonObject } from "curlconverter";
import type { BodyType, HttpMethod, KeyValue, RequestConfig } from "@/shared/types";

const VALID_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function toMethod(raw: string): HttpMethod {
  const upper = raw.toUpperCase();
  return VALID_METHODS.has(upper) ? (upper as HttpMethod) : "GET";
}

function detectBodyType(headers: Record<string, string>, data: unknown): BodyType {
  const ct = Object.entries(headers).find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "";
  if (ct.includes("application/json")) return "application/json";
  if (ct.includes("application/x-www-form-urlencoded")) return "application/x-www-form-urlencoded";
  if (ct.includes("multipart/form-data")) return "multipart/form-data";
  if (ct.includes("text/xml")) return "text/xml";
  if (ct.includes("text/plain")) return "text/plain";
  if (data && typeof data === "object") return "application/json";
  if (typeof data === "string" && data.trim().startsWith("{")) return "application/json";
  if (data) return "text/plain";
  return "none";
}

export function parseCurl(input: string): Partial<RequestConfig> | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const parsed = toJsonObject(trimmed);
    if (!parsed?.url) return null;

    const headers: RequestConfig["headers"] = Object.entries(parsed.headers ?? {}).map(
      ([key, value]) => ({ key, value: String(value), enabled: true }),
    );

    const rawHeaders: Record<string, string> = Object.fromEntries(
      Object.entries(parsed.headers ?? {}).map(([k, v]) => [k, String(v)]),
    );

    const queries: KeyValue[] = Object.entries(parsed.queries ?? {}).map(([key, value]) => ({
      key,
      value: String(value),
      enabled: true,
    }));

    let body = "";
    let bodyType: BodyType = "none";
    let formData: KeyValue[] = [];

    if (parsed.files || (parsed.data && typeof parsed.data === "object")) {
      bodyType = "multipart/form-data";
      const dataEntries =
        typeof parsed.data === "object" && parsed.data !== null
          ? Object.entries(parsed.data as Record<string, string>)
          : [];
      formData = dataEntries.map(([key, value]) => ({ key, value: String(value), enabled: true }));
    } else if (typeof parsed.data === "string") {
      bodyType = detectBodyType(rawHeaders, parsed.data);
      body = parsed.data;
    }

    return {
      method: toMethod(parsed.method ?? "GET"),
      url: parsed.raw_url ?? parsed.url,
      headers,
      params: queries,
      body,
      bodyType,
      formData,
      multipart: [],
      file: null,
    };
  } catch {
    return null;
  }
}
