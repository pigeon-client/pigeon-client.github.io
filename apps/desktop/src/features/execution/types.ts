import type { SseEvent } from "./lib/sse";

// Normalized response produced by execution. response-viewer depends only on this;
// it must not know how the request was sent.
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
  /** Body exceeded the backend's 50MB buffer cap and was cut off. */
  truncated?: boolean;
  /** True when the response was (or is) an SSE stream. */
  sse?: boolean;
  /** Parsed SSE events when streamed; empty while waiting for the first event. */
  sseEvents?: SseEvent[];
  /** Set when this is a history snapshot rendered without re-sending (history-drafts.md). */
  snapshotTimestamp?: number;
  /** True when the snapshot body was cut at the 256KB cap. */
  snapshotTruncated?: boolean;
}
