import type { HttpMethod, RequestConfig } from "@/shared/types";

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
