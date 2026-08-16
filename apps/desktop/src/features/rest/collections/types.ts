import type { AuthConfig, Header, HttpMethod, RequestConfig } from "@/shared/types";

// Max nesting depth for collection folders (configurable)
export const MAX_NESTING_DEPTH = 10;

/**
 * Headers/auth scoped to a folder or collection, inherited by nested requests
 * (see `lib/inheritance.ts`). Both fields are optional independently.
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
  /** Collection-wide headers/auth — lowest inheritance precedence. */
  config?: FolderConfig;
  createdAt: number;
}
