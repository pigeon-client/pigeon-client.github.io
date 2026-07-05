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
}
