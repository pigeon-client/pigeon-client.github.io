import { parseUrl } from "@/shared/lib/url";
import type { RequestConfig } from "@/shared/types";
import type { CollectionNode } from "../types";

/** A collection node carrying extra runtime metadata used while rendering. */
export type InternalNode = CollectionNode & {
  _meta?: string;
  _recent?: boolean;
  _count?: number;
};

/** A flat request row fed into {@link buildUrlTree}. */
export interface UrlTreeReq {
  method: string;
  url: string;
  meta?: string;
  recent?: boolean;
  request?: RequestConfig;
}

/** Recompute leaf counts onto every folder's `_count`. */
export function countNode(n: InternalNode): number {
  if (n.type === "request") return 1;
  let c = 0;
  for (const ch of n.children ?? []) c += countNode(ch as InternalNode);
  n._count = c;
  return c;
}

/** Total request leaves under a node list. */
export function countRequests(nodes: CollectionNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "request") count += 1;
    else count += countRequests(node.children ?? []);
  }
  return count;
}

function findAncestorsPath(
  nodes: CollectionNode[],
  id: string,
  path: CollectionNode[],
): CollectionNode[] | null {
  for (const node of nodes) {
    if (node.id === id) return path;
    if (node.type === "folder") {
      const found = findAncestorsPath(node.children ?? [], id, [...path, node]);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Ancestor folders of `id`, root-first. Empty array if `id` is a top-level
 * node or not found — the caller can still merge over an empty chain safely.
 */
export function findAncestors(nodes: CollectionNode[], id: string): CollectionNode[] {
  return findAncestorsPath(nodes, id, []) ?? [];
}

/**
 * Build an auto-organized tree from a flat URL list: one host folder, then
 * path folders, leaf = endpoint (last path segment).
 */
export function buildUrlTree(reqs: UrlTreeReq[]): CollectionNode[] {
  const nodes: Record<string, CollectionNode> = {};
  const top: CollectionNode[] = [];

  const ensure = (id: string, label: string, arr: CollectionNode[]): CollectionNode => {
    if (!nodes[id]) {
      nodes[id] = { id, name: label, type: "folder", children: [] };
      arr.push(nodes[id]);
    }
    return nodes[id];
  };

  for (const r of reqs) {
    const normalized =
      r.url.startsWith("http://") || r.url.startsWith("https://") ? r.url : parseUrl(r.url);

    let host = "requests";
    let pathParts: string[] = [];
    try {
      const u = new URL(normalized);
      host = u.hostname || host;
      pathParts = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    } catch {
      const m = normalized.match(/^https?:\/\/([^/]+)/i);
      if (m) host = m[1];
    }

    // Folders = host + intermediate path segments. Leaf = final segment.
    const folderSegs = pathParts.slice(0, -1);
    const endpoint = pathParts.at(-1) ?? "/";

    let parentArr = top;
    let id = host;
    parentArr = (ensure(id, host, parentArr).children ?? []) as CollectionNode[];

    for (const seg of folderSegs) {
      id += `/${seg}`;
      parentArr = (ensure(id, seg, parentArr).children ?? []) as CollectionNode[];
    }

    const leafId = `${id}/${endpoint}#${r.method}`;
    if (!nodes[leafId]) {
      const leaf: InternalNode = {
        id: leafId,
        name: endpoint,
        type: "request",
        method: r.method as CollectionNode["method"],
        url: r.url,
        request: r.request,
      };
      leaf._recent = r.recent;
      parentArr.push(leaf);
      nodes[leafId] = leaf;
    }
  }

  for (const t of top) countNode(t);
  return top;
}

/**
 * Path compression: fold single-folder-child chains into one row
 * (`v1 › users › {leaves}` becomes `v1 / users`). The top level (host folders)
 * is left alone so a host always reads as just its domain — path segments only
 * compress beneath it.
 */
export function collapseChains(nodes: CollectionNode[], isTop = false): CollectionNode[] {
  return nodes.map((n) => {
    if (n.type !== "folder") return n;
    if (isTop) {
      // Host stays its own row; compress only its descendants.
      return { ...n, children: collapseChains(n.children ?? []) };
    }
    let name = n.name;
    let cur = n;
    while ((cur.children?.length ?? 0) === 1 && cur.children?.[0].type === "folder") {
      const only = cur.children[0];
      name = `${name}/${only.name}`;
      cur = only;
    }
    return { ...cur, name, children: collapseChains(cur.children ?? []) };
  });
}

/**
 * Group collection-root requests into their resource folder: `/todos` (list) +
 * `/todos/1` (item) → one `todos` folder holding both. When a folder and a
 * sibling request share a name, the request moves inside the folder as its
 * root. Runs deepest-first so nested roots group too.
 */
export function mergeCollectionRoots(nodes: CollectionNode[]): CollectionNode[] {
  // Recurse into folders first.
  for (const n of nodes) {
    if (n.type === "folder") n.children = mergeCollectionRoots(n.children ?? []);
  }
  const folderByName = new Map<string, CollectionNode>();
  for (const n of nodes) if (n.type === "folder") folderByName.set(n.name, n);

  const out: CollectionNode[] = [];
  for (const n of nodes) {
    const folder = n.type === "request" ? folderByName.get(n.name) : undefined;
    if (folder) {
      folder.children = [{ ...n, name: "/" }, ...(folder.children ?? [])];
    } else {
      out.push(n);
    }
  }
  return out;
}

/**
 * Label request leaves by their path relative to the parent folder: the
 * collection root stays "/", every other leaf becomes "/<segment>".
 */
export function relabelLeaves(nodes: CollectionNode[]): void {
  for (const n of nodes) {
    if (n.type === "request") {
      if (n.name !== "/") n.name = `/${n.name}`;
    } else {
      relabelLeaves(n.children ?? []);
    }
  }
}
