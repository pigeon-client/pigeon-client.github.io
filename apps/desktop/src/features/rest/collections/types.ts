import type { AuthConfig, Header, HttpMethod, RequestConfig } from "@/shared/types";

// Max nesting depth for collection folders (configurable)
export const MAX_NESTING_DEPTH = 10;

/**
 * Headers/auth set on a folder, inherited by every request nested under it
 * (see `lib/inheritance.ts`). Both fields are optional independently — a
 * folder can set headers without auth, or vice versa.
 */
export interface FolderConfig {
  headers?: Header[];
  auth?: AuthConfig;
}

export interface CollectionNode {
  id: string;
  type: "folder" | "request";
  name: string;
  children?: CollectionNode[]; // folders only
  request?: RequestConfig; // requests only
  method?: HttpMethod;
  url?: string;
  folderConfig?: FolderConfig; // folders only
}

export interface Collection {
  id?: string;
  name: string;
  root: CollectionNode[]; // tree of folders & requests
  createdAt: number;
}
