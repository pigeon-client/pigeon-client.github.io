/**
 * Content-Type catalog + classifiers for request bodies and response rendering.
 * Media types follow the RFCs / specs noted in each entry (curl-compatible CT strings).
 */

import type { BodyType } from "@/shared/types";

/** How the response panel should render a body. */
export type ResponseKind =
  | "json"
  | "ndjson"
  | "xml"
  | "html"
  | "csv"
  | "yaml"
  | "graphql"
  | "text"
  | "sse"
  | "image"
  | "svg"
  | "audio"
  | "video"
  | "pdf"
  | "zip"
  | "protobuf"
  | "msgpack"
  | "form"
  | "binary"
  | "other";

export type BodyUiGroup = "none" | "json" | "raw" | "form-data" | "urlencoded" | "binary";

export interface ContentTypeInfo {
  /** Canonical media type (no parameters). */
  mime: string;
  label: string;
  /** Spec hint for docs / tooltips. */
  spec: string;
  /** Request body UI group this type belongs to. */
  group: BodyUiGroup;
  /** True → send as UTF-8 text string; false → file/binary bytes. */
  textual: boolean;
  /** Preferred highlight.js language (empty = plain). */
  highlight?: string;
  /** Response render kind when this CT is received. */
  responseKind: ResponseKind;
}

/** Registry of formats we explicitly support (request and/or response). */
export const CONTENT_TYPES: ContentTypeInfo[] = [
  // Text & structured
  {
    mime: "application/json",
    label: "JSON",
    spec: "RFC 8259",
    group: "json",
    textual: true,
    highlight: "json",
    responseKind: "json",
  },
  {
    mime: "application/problem+json",
    label: "Problem Details",
    spec: "RFC 9457",
    group: "raw",
    textual: true,
    highlight: "json",
    responseKind: "json",
  },
  {
    mime: "application/x-ndjson",
    label: "NDJSON",
    spec: "ndjson.org",
    group: "raw",
    textual: true,
    highlight: "json",
    responseKind: "ndjson",
  },
  {
    mime: "application/yaml",
    label: "YAML",
    spec: "RFC 9512",
    group: "raw",
    textual: true,
    highlight: "yaml",
    responseKind: "yaml",
  },
  {
    mime: "text/yaml",
    label: "YAML (text)",
    spec: "RFC 9512",
    group: "raw",
    textual: true,
    highlight: "yaml",
    responseKind: "yaml",
  },
  {
    mime: "application/graphql",
    label: "GraphQL",
    spec: "GraphQL Foundation",
    group: "raw",
    textual: true,
    highlight: "",
    responseKind: "graphql",
  },
  {
    mime: "application/graphql+json",
    label: "GraphQL JSON",
    spec: "GraphQL Foundation",
    group: "raw",
    textual: true,
    highlight: "json",
    responseKind: "json",
  },
  {
    mime: "text/plain",
    label: "Plain Text",
    spec: "RFC 2046 §4.1.3",
    group: "raw",
    textual: true,
    highlight: "",
    responseKind: "text",
  },
  {
    mime: "text/html",
    label: "HTML",
    spec: "WHATWG HTML",
    group: "raw",
    textual: true,
    highlight: "html",
    responseKind: "html",
  },
  {
    mime: "text/csv",
    label: "CSV",
    spec: "RFC 4180",
    group: "raw",
    textual: true,
    highlight: "",
    responseKind: "csv",
  },
  {
    mime: "text/xml",
    label: "XML",
    spec: "RFC 7303 / W3C",
    group: "raw",
    textual: true,
    highlight: "xml",
    responseKind: "xml",
  },
  {
    mime: "application/xml",
    label: "XML (app)",
    spec: "RFC 7303",
    group: "raw",
    textual: true,
    highlight: "xml",
    responseKind: "xml",
  },
  {
    mime: "application/x-www-form-urlencoded",
    label: "URL Encoded",
    spec: "WHATWG URL",
    group: "urlencoded",
    textual: true,
    highlight: "",
    responseKind: "form",
  },
  {
    mime: "multipart/form-data",
    label: "Form Data",
    spec: "RFC 7578",
    group: "form-data",
    textual: false,
    responseKind: "other",
  },
  {
    mime: "text/event-stream",
    label: "SSE",
    spec: "WHATWG HTML §9.2",
    group: "raw",
    textual: true,
    highlight: "",
    responseKind: "sse",
  },

  // Binary / generic
  {
    mime: "application/octet-stream",
    label: "Octet Stream",
    spec: "RFC 2046 §4.5.1",
    group: "binary",
    textual: false,
    responseKind: "binary",
  },
  {
    mime: "application/pdf",
    label: "PDF",
    spec: "RFC 8118 / ISO 32000",
    group: "binary",
    textual: false,
    responseKind: "pdf",
  },
  {
    mime: "application/zip",
    label: "ZIP",
    spec: "PKWARE / RFC 6839 +zip",
    group: "binary",
    textual: false,
    responseKind: "zip",
  },
  {
    mime: "application/protobuf",
    label: "Protobuf",
    spec: "Google Protocol Buffers",
    group: "binary",
    textual: false,
    responseKind: "protobuf",
  },
  {
    mime: "application/x-protobuf",
    label: "Protobuf (x-)",
    spec: "Google Protocol Buffers",
    group: "binary",
    textual: false,
    responseKind: "protobuf",
  },
  {
    mime: "application/msgpack",
    label: "MessagePack",
    spec: "msgpack.org",
    group: "binary",
    textual: false,
    responseKind: "msgpack",
  },
  {
    mime: "application/x-msgpack",
    label: "MessagePack (x-)",
    spec: "msgpack.org",
    group: "binary",
    textual: false,
    responseKind: "msgpack",
  },

  // Image
  {
    mime: "image/jpeg",
    label: "JPEG",
    spec: "ISO/IEC 10918-1",
    group: "binary",
    textual: false,
    responseKind: "image",
  },
  {
    mime: "image/png",
    label: "PNG",
    spec: "RFC 2083",
    group: "binary",
    textual: false,
    responseKind: "image",
  },
  {
    mime: "image/gif",
    label: "GIF",
    spec: "GIF89a",
    group: "binary",
    textual: false,
    responseKind: "image",
  },
  {
    mime: "image/webp",
    label: "WebP",
    spec: "RFC 9649",
    group: "binary",
    textual: false,
    responseKind: "image",
  },
  {
    mime: "image/svg+xml",
    label: "SVG",
    spec: "W3C SVG",
    group: "binary",
    textual: false,
    highlight: "xml",
    responseKind: "svg",
  },
  {
    mime: "image/avif",
    label: "AVIF",
    spec: "AOMedia",
    group: "binary",
    textual: false,
    responseKind: "image",
  },

  // Video
  {
    mime: "video/mp4",
    label: "MP4",
    spec: "RFC 4337 / ISO 14496-14",
    group: "binary",
    textual: false,
    responseKind: "video",
  },
  {
    mime: "video/webm",
    label: "WebM",
    spec: "WebM Project",
    group: "binary",
    textual: false,
    responseKind: "video",
  },
  {
    mime: "video/ogg",
    label: "Ogg Video",
    spec: "RFC 5334",
    group: "binary",
    textual: false,
    responseKind: "video",
  },
  {
    mime: "video/quicktime",
    label: "QuickTime",
    spec: "Apple QuickTime",
    group: "binary",
    textual: false,
    responseKind: "video",
  },

  // Audio
  {
    mime: "audio/mpeg",
    label: "MP3",
    spec: "RFC 3003",
    group: "binary",
    textual: false,
    responseKind: "audio",
  },
  {
    mime: "audio/wav",
    label: "WAV",
    spec: "Microsoft/IBM RIFF",
    group: "binary",
    textual: false,
    responseKind: "audio",
  },
  {
    mime: "audio/x-wav",
    label: "WAV (x-)",
    spec: "Microsoft/IBM RIFF",
    group: "binary",
    textual: false,
    responseKind: "audio",
  },
  {
    mime: "audio/ogg",
    label: "Ogg Audio",
    spec: "RFC 5334",
    group: "binary",
    textual: false,
    responseKind: "audio",
  },
  {
    mime: "audio/aac",
    label: "AAC",
    spec: "ISO/IEC 13818-7",
    group: "binary",
    textual: false,
    responseKind: "audio",
  },
  {
    mime: "audio/webm",
    label: "WebM Audio",
    spec: "WebM Project",
    group: "binary",
    textual: false,
    responseKind: "audio",
  },
];

const BY_MIME = new Map(CONTENT_TYPES.map((c) => [c.mime.toLowerCase(), c]));

/** Strip parameters (`application/json; charset=utf-8` → `application/json`). */
export function normalizeMime(contentType: string | undefined | null): string {
  if (!contentType) return "";
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function lookupContentType(
  contentType: string | undefined | null,
): ContentTypeInfo | undefined {
  const mime = normalizeMime(contentType);
  if (!mime) return undefined;
  return BY_MIME.get(mime);
}

/** Raw-tab formats shown in the Body editor dropdown (excludes JSON shortcut). */
export const RAW_BODY_FORMATS: { label: string; value: BodyType; spec: string }[] =
  CONTENT_TYPES.filter((c) => c.group === "raw").map((c) => ({
    label: c.label,
    value: c.mime as BodyType,
    spec: c.spec,
  }));

/** Binary-tab subtype picker. */
export const BINARY_BODY_FORMATS: { label: string; value: BodyType; spec: string }[] =
  CONTENT_TYPES.filter((c) => c.group === "binary").map((c) => ({
    label: c.label,
    value: c.mime as BodyType,
    spec: c.spec,
  }));

export function isKnownBodyType(value: string): value is BodyType {
  if (value === "none") return true;
  return BY_MIME.has(value.toLowerCase());
}

export function isTextualBodyType(bodyType: BodyType): boolean {
  if (bodyType === "none" || bodyType === "multipart/form-data") return false;
  if (bodyType === "application/x-www-form-urlencoded") return true;
  const info = BY_MIME.get(bodyType.toLowerCase());
  if (info) return info.textual;
  // Unknown custom CT from older data — treat as text if not obviously binary.
  return !isBinaryMime(bodyType);
}

export function isBinaryBodyType(bodyType: BodyType): boolean {
  if (bodyType === "none" || bodyType === "multipart/form-data") return false;
  if (bodyType === "application/x-www-form-urlencoded") return false;
  const info = BY_MIME.get(bodyType.toLowerCase());
  if (info) return !info.textual;
  return isBinaryMime(bodyType);
}

/** Content-Type header value to send for this body type (null = none / multipart boundary). */
export function contentTypeForBody(bodyType: BodyType): string | null {
  if (bodyType === "none" || bodyType === "multipart/form-data") return null;
  return bodyType;
}

export function bodyUiGroup(bodyType: BodyType): BodyUiGroup {
  if (bodyType === "none") return "none";
  if (bodyType === "application/json") return "json";
  if (bodyType === "multipart/form-data") return "form-data";
  if (bodyType === "application/x-www-form-urlencoded") return "urlencoded";
  const info = BY_MIME.get(bodyType.toLowerCase());
  if (info) return info.group;
  if (isBinaryMime(bodyType)) return "binary";
  return "raw";
}

export function highlightLanguageFor(contentType: string | BodyType): string {
  const info = lookupContentType(contentType);
  if (info?.highlight) return info.highlight;
  const kind = classifyResponse(contentType);
  switch (kind) {
    case "json":
    case "ndjson":
      return "json";
    case "xml":
    case "svg":
      return "xml";
    case "html":
      return "html";
    case "yaml":
      return "yaml";
    default:
      return "";
  }
}

export function isBinaryMime(contentType: string): boolean {
  const mime = normalizeMime(contentType);
  if (!mime) return false;
  const info = BY_MIME.get(mime);
  if (info) return !info.textual;
  if (mime.startsWith("image/") && mime !== "image/svg+xml") return true;
  if (mime.startsWith("audio/") || mime.startsWith("video/")) return true;
  if (mime.startsWith("application/octet")) return true;
  if (mime.includes("protobuf") || mime.includes("msgpack")) return true;
  if (mime === "application/pdf" || mime === "application/zip" || mime.endsWith("+zip"))
    return true;
  return false;
}

/**
 * Classify a response Content-Type into a render kind.
 * Prefers registry hits, then structured suffix / type-prefix heuristics.
 */
export function classifyResponse(contentType: string | undefined | null): ResponseKind {
  const mime = normalizeMime(contentType);
  if (!mime) return "other";

  const known = BY_MIME.get(mime);
  if (known) return known.responseKind;

  // Structured suffixes (RFC 6838)
  if (mime.includes("ndjson") || mime.includes("jsonlines")) return "ndjson";
  if (mime.endsWith("+json") || mime.includes("json")) return "json";
  if (mime.endsWith("+yaml") || mime.includes("yaml")) return "yaml";
  if (mime.endsWith("+xml") || mime.includes("xml")) {
    if (mime.includes("svg")) return "svg";
    return "xml";
  }
  if (mime.includes("event-stream")) return "sse";
  if (mime.includes("graphql")) return "graphql";
  if (mime.includes("protobuf") || mime.includes("proto")) return "protobuf";
  if (mime.includes("msgpack") || mime.includes("messagepack")) return "msgpack";
  if (mime === "application/pdf" || mime.endsWith("+pdf")) return "pdf";
  if (mime === "application/zip" || mime.endsWith("+zip")) return "zip";
  if (mime.startsWith("image/svg")) return "svg";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("text/")) return "text";
  if (mime.includes("form-urlencoded") || mime.includes("multipart")) return "form";
  if (mime.includes("octet-stream")) return "binary";
  // Unknown application media types are opaque by default. Never decode them
  // as text based on body bytes; response Content-Type stays authoritative.
  if (mime.startsWith("application/")) return "binary";
  // Unknown vendor/top-level types are also safest as downloadable bytes.
  return "binary";
}

/** Human label for binary / media download affordances. */
export function responseKindLabel(kind: ResponseKind, contentType: string): string {
  const known = lookupContentType(contentType);
  if (known) return known.label;
  switch (kind) {
    case "pdf":
      return "PDF";
    case "zip":
      return "ZIP archive";
    case "protobuf":
      return "Protocol Buffers";
    case "msgpack":
      return "MessagePack";
    case "audio":
      return "Audio";
    case "video":
      return "Video";
    case "image":
      return "Image";
    case "binary":
      return "Binary";
    default:
      return contentType || "Response";
  }
}

/** Infer BodyType from a Content-Type header on import (curl -H). */
export function bodyTypeFromContentType(contentType: string | undefined | null): BodyType | null {
  const mime = normalizeMime(contentType);
  if (!mime) return null;
  if (mime === "multipart/form-data") return "multipart/form-data";
  if (BY_MIME.has(mime)) return mime as BodyType;
  if (mime.includes("json") && !mime.includes("ndjson")) return "application/json";
  if (mime.includes("yaml")) return "application/yaml";
  if (mime.includes("xml")) return "application/xml";
  if (mime.includes("html")) return "text/html";
  if (mime.includes("csv")) return "text/csv";
  if (mime.startsWith("text/")) return "text/plain";
  if (isBinaryMime(mime)) return "application/octet-stream";
  return null;
}
