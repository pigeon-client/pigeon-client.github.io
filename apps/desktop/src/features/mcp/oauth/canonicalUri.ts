/**
 * Canonical MCP server URI per the MCP authorization spec (RFC 8707 §2 / RFC 9728
 * `resource`): lowercase scheme + host, no fragment, no trailing slash (unless the
 * root path itself is semantically significant, which we don't special-case here).
 * Used both as the OAuth `resource` parameter and as the SQLite primary key for
 * this server's stored client registration + tokens.
 */
export class InvalidServerUriError extends Error {}

export function canonicalizeServerUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new InvalidServerUriError(`Not a valid absolute URI: "${rawUrl}"`);
  }

  if (parsed.hash) {
    throw new InvalidServerUriError(
      `Canonical server URI must not contain a fragment: "${rawUrl}"`,
    );
  }

  // The WHATWG URL parser already lowercases scheme + host. It also always adds a
  // trailing "/" for an empty path; the spec prefers the form without it.
  let result = parsed.toString();
  if (result.endsWith("/") && parsed.pathname === "/" && !parsed.search) {
    result = result.slice(0, -1);
  }
  return result;
}
