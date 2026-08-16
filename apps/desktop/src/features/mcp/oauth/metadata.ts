/** RFC 9728 OAuth 2.0 Protected Resource Metadata (subset this client uses). */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers?: string[];
  [key: string]: unknown;
}

/** RFC 8414 OAuth 2.0 Authorization Server Metadata (subset this client uses). */
export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  code_challenge_methods_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  [key: string]: unknown;
}

export class MetadataDiscoveryError extends Error {}

const HTTP_SCHEMES = new Set(["http:", "https:"]);

/** True for absolute http(s) URLs. Used before native discovery GETs and browser opens. */
export function isAllowedOauthHttpUrl(value: string): boolean {
  try {
    return HTTP_SCHEMES.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Strip a trailing slash so `https://as.example.com` and `…com/` compare equal. */
export function canonicalizeIssuer(value: string): string {
  const parsed = new URL(value);
  const path = parsed.pathname.replace(/\/$/, "");
  return `${parsed.origin}${path}`;
}

export function issuersMatch(expected: string, actual: string): boolean {
  try {
    return canonicalizeIssuer(expected) === canonicalizeIssuer(actual);
  } catch {
    return false;
  }
}

/**
 * Extracts the `resource_metadata` URL from a `WWW-Authenticate` header per
 * RFC 9728 §5.1, e.g.:
 *   Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"
 * Returns null if the header is missing/malformed rather than throwing — callers
 * decide whether to fall back to the default well-known path at the server origin.
 * Non-http(s) metadata URLs are ignored (same as malformed) so the native HTTP
 * client is not pointed at file:/javascript:/custom schemes.
 */
export function parseWwwAuthenticate(headerValue: string | undefined | null): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(/resource_metadata\s*=\s*"([^"]+)"/i);
  const url = match?.[1];
  if (!(url && isAllowedOauthHttpUrl(url))) return null;
  return url;
}

/** Fallback PRM URL when a 401 carries no (or an unparseable) WWW-Authenticate header. */
export function buildDefaultProtectedResourceMetadataUrl(serverUrl: string): string {
  const origin = new URL(serverUrl).origin;
  return `${origin}/.well-known/oauth-protected-resource`;
}

/**
 * RFC 8414 §3.1 well-known URI construction: insert
 * "/.well-known/oauth-authorization-server" between the authority and any path
 * component of the issuer identifier.
 *   https://as.example.com          -> https://as.example.com/.well-known/oauth-authorization-server
 *   https://as.example.com/tenant1  -> https://as.example.com/.well-known/oauth-authorization-server/tenant1
 */
export function buildAuthorizationServerMetadataUrl(issuer: string): string {
  if (!isAllowedOauthHttpUrl(issuer)) {
    throw new MetadataDiscoveryError("Authorization server issuer must be an http(s) URL");
  }
  const parsed = new URL(issuer);
  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
  return `${parsed.origin}/.well-known/oauth-authorization-server${path}`;
}

export function parseProtectedResourceMetadata(bodyText: string): ProtectedResourceMetadata {
  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    throw new MetadataDiscoveryError("Protected Resource Metadata response was not valid JSON");
  }
  const metadata = json as Partial<ProtectedResourceMetadata>;
  const allowed = (metadata.authorization_servers ?? []).filter(isAllowedOauthHttpUrl);
  if (allowed.length === 0) {
    throw new MetadataDiscoveryError(
      "Protected Resource Metadata is missing a non-empty http(s) authorization_servers array",
    );
  }
  return { ...metadata, authorization_servers: allowed } as ProtectedResourceMetadata;
}

export function parseAuthorizationServerMetadata(
  bodyText: string,
  expectedIssuer?: string,
): AuthorizationServerMetadata {
  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    throw new MetadataDiscoveryError("Authorization Server Metadata response was not valid JSON");
  }
  const metadata = json as Partial<AuthorizationServerMetadata>;
  if (!(metadata.authorization_endpoint && metadata.token_endpoint)) {
    throw new MetadataDiscoveryError(
      "Authorization Server Metadata is missing authorization_endpoint or token_endpoint",
    );
  }
  if (
    !(
      isAllowedOauthHttpUrl(metadata.authorization_endpoint) &&
      isAllowedOauthHttpUrl(metadata.token_endpoint)
    )
  ) {
    throw new MetadataDiscoveryError(
      "Authorization Server Metadata endpoints must be http(s) URLs",
    );
  }
  if (metadata.registration_endpoint && !isAllowedOauthHttpUrl(metadata.registration_endpoint)) {
    throw new MetadataDiscoveryError(
      "Authorization Server Metadata registration_endpoint must be an http(s) URL",
    );
  }
  if (expectedIssuer) {
    if (!(metadata.issuer && issuersMatch(expectedIssuer, metadata.issuer))) {
      throw new MetadataDiscoveryError(
        "Authorization Server Metadata issuer does not match the discovered authorization server",
      );
    }
  }
  return metadata as AuthorizationServerMetadata;
}
