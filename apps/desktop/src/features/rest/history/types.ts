import type { HttpMethod, RequestConfig } from "@/shared/types";

/** Response body captured at send time — text only, capped, never re-fetched. */
export interface ResponseSnapshot {
  status: number;
  statusText: string;
  contentType: string;
  /** Original response size in bytes (pre-truncation). */
  size: number;
  /** Absent for binary/media responses — those store metadata (content-type + size) only. */
  bodyText?: string;
  truncated: boolean;
  /** List queries omit `bodyText`; fetch via `getHistorySnapshot(id)`. */
  bodyOmitted?: boolean;
}

export interface HistoryItem {
  id?: number;
  name: string;
  method: HttpMethod;
  url: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  request: RequestConfig;
  snapshot?: ResponseSnapshot;
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
