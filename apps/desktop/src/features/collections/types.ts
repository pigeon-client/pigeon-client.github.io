import type { HttpMethod, RequestConfig } from "@/shared/types";

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
