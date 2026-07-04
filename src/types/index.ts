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

export type { Collection, CollectionNode } from "../features/collections/types";
export { MAX_NESTING_DEPTH } from "../features/collections/types";
export type { Environment } from "../features/environments/types";
export type { DraftNode, HistoryItem } from "../features/history/types";
