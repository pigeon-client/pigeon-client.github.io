/** PKCE + state helpers (OAuth 2.1 §7.5.2, RFC 7636) for the MCP authorization flow. */

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC 7636 §4.1 — 43-128 char unreserved-character string; we use 32 random bytes (43 chars). */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** RFC 7636 §4.2 — S256: BASE64URL(SHA256(ASCII(code_verifier))). */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

/** Opaque, unguessable `state` param — validated against the callback per the spec's Open Redirection guidance. */
export function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}
