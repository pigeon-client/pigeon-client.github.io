/**
 * Split a URL into its base (no query) and the decoded query pairs.
 * Used to lift a pasted URL's query string into the Params editor.
 */
export function splitUrlQuery(url: string): {
  base: string;
  params: { key: string; value: string }[];
} {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return { base: url, params: [] };
  const base = url.slice(0, qIdx);
  const hashIdx = url.indexOf("#", qIdx);
  const qs = url.slice(qIdx + 1, hashIdx === -1 ? undefined : hashIdx);
  const dec = (s: string) => {
    try {
      return decodeURIComponent(s.replace(/\+/g, " "));
    } catch {
      return s;
    }
  };
  const params = qs
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      return eq === -1
        ? { key: dec(pair), value: "" }
        : { key: dec(pair.slice(0, eq)), value: dec(pair.slice(eq + 1)) };
    });
  return { base, params };
}

/** URL without its `?query` (keeps any `#hash`). */
export function stripQuery(url: string): string {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return url;
  const hashIdx = url.indexOf("#", qIdx);
  return url.slice(0, qIdx) + (hashIdx === -1 ? "" : url.slice(hashIdx));
}

/** Build a `k=v&k2=v2` query string from enabled, keyed params. */
export function buildQueryString(params: { key: string; value: string; enabled?: boolean }[]) {
  return params
    .filter((p) => (p.enabled ?? true) && p.key.trim())
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
}

/** Rewrite a URL's query to reflect the given params (keeps base + hash). */
export function applyParamsToUrl(
  url: string,
  params: { key: string; value: string; enabled?: boolean }[],
): string {
  const base = stripQuery(url);
  const hashIdx = base.indexOf("#");
  const path = hashIdx === -1 ? base : base.slice(0, hashIdx);
  const hash = hashIdx === -1 ? "" : base.slice(hashIdx);
  const qs = buildQueryString(params);
  return qs ? `${path}?${qs}${hash}` : `${path}${hash}`;
}

/**
 * Parse user input URL
 * :3000 -> http://localhost:3000
 * Respects existing protocols
 */
export function parseUrl(input: string): string {
  input = input.trim();

  // RFC 9110 §9.3.7 — OPTIONS request-target may be a bare asterisk.
  if (input === "*") return "*";

  // Port shortcut: :3000, :3000/api, :3000?query=1
  if (input.startsWith(":")) {
    return `http://localhost${input}`;
  }

  // If already has protocol, respect it
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }

  // Default to http:// for domains without protocol
  return `http://${input}`;
}

/**
 * Extract main domain (e.g., api.example.com -> example.com)
 */
export function extractMainDomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

/**
 * Extract endpoint name from URL for auto-naming tabs
 */
export function extractEndpoint(url: string): string {
  if (url.trim() === "*") return "*";
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path === "/" || !path) return parsed.hostname;
    return path;
  } catch {
    return url;
  }
}

/**
 * Extract path segments from URL for auto-folder creation
 * e.g., "https://api.example.com/v2/users/123" → ["example.com", "api.example.com", "v2", "users"]
 */
export function extractPathSegments(url: string): string[] {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const mainDomain = extractMainDomain(hostname);
    const pathParts = parsed.pathname
      .replace(/\/+$/, "") // strip trailing slash
      .split("/")
      .filter(Boolean)
      .slice(0, -1); // exclude the last segment (it's the request name)
    return [mainDomain, hostname, ...pathParts];
  } catch {
    return [];
  }
}

/**
 * Normalize URL for draft matching (strip query, trailing slash, protocol)
 * e.g., "https://api.example.com/v2/users?page=1" → "GET:api.example.com/v2/users"
 */
export function normalizeUrlForMatch(method: string, url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${method.toUpperCase()}:${parsed.hostname}${path}`;
  } catch {
    return `${method.toUpperCase()}:${url}`;
  }
}
