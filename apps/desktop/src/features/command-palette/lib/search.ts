import type { Collection, CollectionNode } from "@/features/rest/collections";
import type { HistoryItem, ResponseSnapshot } from "@/features/rest/history";
import { relativeTime } from "@/shared/lib/time";
import type { HttpMethod, RequestConfig } from "@/shared/types";

export { relativeTime };

export interface PaletteItem {
  key: string;
  source: "history" | "draft" | "collection";
  /** "History" / "Draft" / the collection's name — shown as the row's source badge. */
  sourceLabel: string;
  method: HttpMethod;
  name: string;
  url: string;
  request: RequestConfig;
  /** History only — undefined for drafts/collection requests. */
  timestamp?: number;
  responseTime?: number;
  /** History only — the captured response snapshot, if any (Phase 6). */
  snapshot?: ResponseSnapshot;
}

export interface PaletteResult extends PaletteItem {
  /** Match tier, lower = better. Not shown in the UI, only used to sort. */
  tier: number;
}

function walkCollectionRequests(
  nodes: CollectionNode[],
  collectionName: string,
  out: PaletteItem[],
): void {
  for (const n of nodes) {
    if (n.type === "folder") {
      walkCollectionRequests(n.children ?? [], collectionName, out);
    } else if (n.request) {
      out.push({
        key: `collection:${collectionName}:${n.id}`,
        source: "collection",
        sourceLabel: collectionName,
        method: n.method ?? n.request.method,
        name: n.name,
        url: n.url ?? n.request.url,
        request: n.request,
      });
    }
  }
}

/** Flatten history, drafts, and every collection's request tree into one searchable list. */
export function collectPaletteItems(opts: {
  history: HistoryItem[];
  drafts: RequestConfig[];
  collections: Collection[];
}): PaletteItem[] {
  const items: PaletteItem[] = [];
  opts.history.forEach((h, i) => {
    items.push({
      key: `history:${h.id ?? i}`,
      source: "history",
      sourceLabel: "History",
      method: h.method,
      name: h.name,
      url: h.url,
      request: h.request,
      timestamp: h.timestamp,
      responseTime: h.responseTime,
      snapshot: h.snapshot,
    });
  });
  opts.drafts.forEach((d, i) => {
    items.push({
      key: `draft:${d.id ?? i}`,
      source: "draft",
      sourceLabel: "Draft",
      method: d.method,
      name: d.name,
      url: d.url,
      request: d,
    });
  });
  for (const c of opts.collections) {
    walkCollectionRequests(c.root ?? [], c.name, items);
  }
  return items;
}

/**
 * Best (lowest) match tier for a query against one item, or `null` if it doesn't
 * match at all. Tiers: 0 exact URL, 1 URL prefix, 2 URL substring, 3 name/method,
 * 4 header key/value, 5 request body text, 6 response-snapshot body text (Phase 6
 * — ranked below every request-field match, per the launch brief).
 */
function matchTier(item: PaletteItem, q: string): number | null {
  const url = item.url.toLowerCase();
  if (url === q) return 0;
  if (url.startsWith(q)) return 1;
  if (url.includes(q)) return 2;
  if (item.name.toLowerCase().includes(q) || item.method.toLowerCase().includes(q)) return 3;
  for (const h of item.request.headers ?? []) {
    if (h.key.toLowerCase().includes(q) || h.value.toLowerCase().includes(q)) return 4;
  }
  if (item.request.body?.toLowerCase().includes(q)) return 5;
  if (item.snapshot?.bodyText?.toLowerCase().includes(q)) return 6;
  return null;
}

/** Case-insensitive substring search across all sources, ranked and recency-tied. */
export function searchPalette(items: PaletteItem[], query: string, limit = 50): PaletteResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: PaletteResult[] = [];
  for (const item of items) {
    const tier = matchTier(item, q);
    if (tier !== null) results.push({ ...item, tier });
  }
  results.sort((a, b) => a.tier - b.tier || (b.timestamp ?? 0) - (a.timestamp ?? 0));
  return results.slice(0, limit);
}

/** Host for the row's secondary text, e.g. "api.example.com". Falls back to the raw URL. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    const m = url.match(/^https?:\/\/([^/]+)/i);
    return m ? m[1] : url;
  }
}
