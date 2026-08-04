import type { AuthConfig, Header, RequestConfig } from "@/shared/types";
import type { CollectionNode } from "../types";

/**
 * Merge ancestor folder config (headers/auth) into a request. Precedence,
 * closest wins: request's own headers/auth > nearest ancestor folder > root
 * folder. Header merge is by key (case-insensitive); a key already present in
 * a closer layer is not overridden by a farther one. Auth: the first enabled
 * (non-"none") auth found, searching from the request's own auth outward to
 * the root folder.
 */
export function resolveInheritedRequest(
  ancestors: CollectionNode[],
  request: RequestConfig,
): RequestConfig {
  const inheritedHeaders = mergeHeaders(ancestors, request.headers);
  const inheritedAuth = resolveAuth(ancestors, request.auth);
  if (inheritedHeaders === request.headers && inheritedAuth === request.auth) return request;
  return { ...request, headers: inheritedHeaders, auth: inheritedAuth };
}

function mergeHeaders(ancestors: CollectionNode[], ownHeaders: Header[]): Header[] {
  const seen = new Set(ownHeaders.map((h) => h.key.trim().toLowerCase()).filter(Boolean));
  const inherited: Header[] = [];
  // Closest ancestor (end of array, since `ancestors` is root-first) wins over farther ones.
  for (let i = ancestors.length - 1; i >= 0; i--) {
    for (const h of ancestors[i].folderConfig?.headers ?? []) {
      const key = h.key.trim().toLowerCase();
      if (!(key && h.enabled) || seen.has(key)) continue;
      seen.add(key);
      inherited.push({ ...h, inherited: true });
    }
  }
  return inherited.length === 0 ? ownHeaders : [...inherited, ...ownHeaders];
}

function isSetAuth(auth: AuthConfig | undefined): auth is AuthConfig {
  return !!auth && auth.type !== "none";
}

function resolveAuth(ancestors: CollectionNode[], ownAuth: AuthConfig): AuthConfig {
  if (isSetAuth(ownAuth)) return ownAuth;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const auth = ancestors[i].folderConfig?.auth;
    if (isSetAuth(auth)) return auth;
  }
  return ownAuth;
}
