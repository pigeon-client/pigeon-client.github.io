// TRANSITIONAL barrel — core types now live in @/shared/types.
// Feature-specific types get relocated to their features during migration.
// Existing `../types` imports keep resolving through here until then.

export type {
  AuthConfig,
  BodyType,
  FileData,
  Header,
  HttpMethod,
  KeyValue,
  RequestConfig,
} from "../shared/types";

// ── Feature types (relocated per-feature later) ──

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: number[];
  contentType: string;
  responseTime: number;
  size: number;
  resolvedUrl?: string;
  sentHeaders?: Record<string, string>;
}

export interface Environment {
  id?: number;
  name: string;
  variables: Record<string, string>;
}

import type { HttpMethod, RequestConfig } from "../shared/types";

export interface HistoryItem {
  id?: number;
  name: string;
  method: HttpMethod;
  url: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  request: RequestConfig;
}

// Max nesting depth for collection folders (configurable)
export const MAX_NESTING_DEPTH = 10;

export interface CollectionNode {
  id: string;
  type: "folder" | "request";
  name: string;
  children?: CollectionNode[]; // folders only
  request?: RequestConfig; // requests only
  method?: HttpMethod;
  url?: string;
}

export interface Collection {
  id?: string;
  name: string;
  root: CollectionNode[]; // tree of folders & requests
  createdAt: number;
}

/** Draft auto-folder hierarchy: domain → subdomain → path folders */
export interface DraftNode {
  id: string;
  type: "folder" | "request";
  name: string;
  children: DraftNode[];
  request?: RequestConfig;
  method?: HttpMethod;
  url?: string;
  /** Key used to match existing drafts (method + normalized URL) */
  matchKey?: string;
}
