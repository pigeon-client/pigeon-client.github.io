// Core request-shaping types shared across features
// (request-builder, execution, history, collections, import-export).

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "QUERY";

/**
 * Request body Content-Type (or `none`). Values match curl `-H 'Content-Type: …'`
 * media types; see `shared/lib/contentType.ts` for the full catalog + specs.
 */
export type BodyType =
  | "none"
  // Text & structured
  | "application/json"
  | "application/problem+json"
  | "application/x-ndjson"
  | "application/yaml"
  | "text/yaml"
  | "application/graphql"
  | "application/graphql+json"
  | "text/plain"
  | "text/html"
  | "text/csv"
  | "text/xml"
  | "application/xml"
  | "text/event-stream"
  // Forms
  | "application/x-www-form-urlencoded"
  | "multipart/form-data"
  // Binary / generic
  | "application/octet-stream"
  | "application/pdf"
  | "application/zip"
  | "application/protobuf"
  | "application/x-protobuf"
  | "application/msgpack"
  | "application/x-msgpack"
  // Image
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "image/svg+xml"
  | "image/avif"
  // Video
  | "video/mp4"
  | "video/webm"
  | "video/ogg"
  | "video/quicktime"
  // Audio
  | "audio/mpeg"
  | "audio/wav"
  | "audio/x-wav"
  | "audio/ogg"
  | "audio/aac"
  | "audio/webm";

export interface Header {
  key: string;
  value: string;
  enabled: boolean;
  /** Set when this header came from a collection/draft folder's inherited
   *  config, not typed directly on the request — see `collections/lib/inheritance.ts`. */
  inherited?: boolean;
}

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
  isFile?: boolean;
  file?: File | null;
  fileName?: string;
  /** Masked value (secret mode — used by the environment editor). */
  secret?: boolean;
  /** Set when this row came from a collection/draft folder's inherited config. */
  inherited?: boolean;
}

export interface FileData {
  name: string;
  data: number[];
  type: string;
}

export interface AuthConfig {
  type: "none" | "basic" | "bearer" | "api-key";
  username: string;
  password: string;
  token: string;
  apiKey: string;
  apiValue: string;
  apiAddTo: "header" | "query";
}

export interface RequestConfig {
  id?: number;
  name: string;
  /**
   * Name origin. `false`/absent = auto-generated from the URL path (follows the
   * path as it changes). `true` = user renamed it manually (never auto-changed).
   */
  nameLocked?: boolean;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: Header[];
  bodyType: BodyType;
  body: string;
  formData: KeyValue[];
  multipart: KeyValue[];
  file: File | null;
  auth: AuthConfig;
}
