import { canonicalizeServerUrl } from "./canonicalUri";
import {
  buildAuthorizationServerMetadataUrl,
  buildDefaultProtectedResourceMetadataUrl,
  parseAuthorizationServerMetadata,
  parseProtectedResourceMetadata,
  parseWwwAuthenticate,
} from "./metadata";
import { type McpOauthRecord, saveMcpOauth } from "./oauthDb";
import {
  oauthHttpRequest,
  openExternalUrl,
  openOauthLoopback,
  waitForOauthLoopback,
} from "./oauthHttp";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "./pkce";

const AUTHORIZATION_TIMEOUT_MS = 5 * 60 * 1000;

export class OauthFlowError extends Error {}

/** Thrown when the authorization server has no `registration_endpoint` and the
 * caller didn't supply a manually-registered client id — the UI should show the
 * manual client-registration fields and retry with `opts.manualClient` set. */
export class OauthManualClientRequiredError extends OauthFlowError {}

export interface ManualClientRegistration {
  clientId: string;
  clientSecret?: string;
  scope?: string;
}

export interface RunAuthorizationCodeFlowOptions {
  manualClient?: ManualClientRegistration;
  onStatus?: (status: string) => void;
}

/** Pure — builds the `/authorize` URL. Exported for unit testing. */
export function buildAuthorizationUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  resource: string;
  scope?: string;
}): string {
  const url = new URL(params.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  // RFC 8707 — MUST be sent regardless of whether the AS is known to support it.
  url.searchParams.set("resource", params.resource);
  if (params.scope) url.searchParams.set("scope", params.scope);
  return url.toString();
}

/** Pure — builds the authorization_code token request body (form-urlencoded). */
export function buildTokenRequestBody(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
  resource: string;
}): string {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
    resource: params.resource,
  }).toString();
}

/** Pure — builds the refresh_token token request body. */
export function buildRefreshRequestBody(params: {
  refreshToken: string;
  clientId: string;
  resource: string;
}): string {
  return new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    resource: params.resource,
  }).toString();
}

/** Pure — RFC 7591 dynamic client registration request body. */
export function buildRegistrationRequestBody(redirectUri: string): string {
  return JSON.stringify({
    client_name: "Pigeon",
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    // Public client — PKCE is the code-interception defense, no client secret.
    token_endpoint_auth_method: "none",
  });
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

function parseTokenResponse(status: number, bodyText: string): TokenResponse {
  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    throw new OauthFlowError(`Token endpoint returned an unparseable response (HTTP ${status})`);
  }
  if (status < 200 || status >= 300) {
    const err = json as { error?: string; error_description?: string };
    throw new OauthFlowError(
      err.error
        ? `Token request failed: ${err.error}${err.error_description ? ` — ${err.error_description}` : ""}`
        : `Token request failed with HTTP ${status}`,
    );
  }
  const token = json as Partial<TokenResponse>;
  if (!token.access_token) {
    throw new OauthFlowError("Token endpoint response is missing access_token");
  }
  return token as TokenResponse;
}

async function tokenRequest(
  tokenEndpoint: string,
  body: string,
  clientId: string,
  clientSecret: string | undefined,
): Promise<TokenResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
  if (clientSecret) headers.Authorization = basicAuthHeader(clientId, clientSecret);
  const res = await oauthHttpRequest("POST", tokenEndpoint, headers, body);
  return parseTokenResponse(res.status, res.bodyText);
}

function toRecord(
  canonicalServerUrl: string,
  authServer: Awaited<ReturnType<typeof discoverAuthorizationServer>>,
  clientId: string,
  clientSecret: string | undefined,
  manualClientId: boolean,
  scope: string | undefined,
  token: TokenResponse,
): McpOauthRecord {
  return {
    serverUrl: canonicalServerUrl,
    authorizationServer: authServer.metadata.issuer,
    authorizationEndpoint: authServer.metadata.authorization_endpoint,
    tokenEndpoint: authServer.metadata.token_endpoint,
    registrationEndpoint: authServer.metadata.registration_endpoint,
    clientId,
    clientSecret,
    manualClientId,
    scope: token.scope ?? scope,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
  };
}

async function discoverAuthorizationServer(serverUrl: string, wwwAuthenticate?: string) {
  const prmUrl =
    parseWwwAuthenticate(wwwAuthenticate) ?? buildDefaultProtectedResourceMetadataUrl(serverUrl);
  const prmRes = await oauthHttpRequest("GET", prmUrl, { Accept: "application/json" });
  if (prmRes.status < 200 || prmRes.status >= 300) {
    throw new OauthFlowError(`Protected Resource Metadata fetch failed (HTTP ${prmRes.status})`);
  }
  const prm = parseProtectedResourceMetadata(prmRes.bodyText);
  const issuer = prm.authorization_servers?.[0];
  if (!issuer) {
    throw new OauthFlowError("Protected Resource Metadata listed no authorization server");
  }

  const asMetadataUrl = buildAuthorizationServerMetadataUrl(issuer);
  const asRes = await oauthHttpRequest("GET", asMetadataUrl, { Accept: "application/json" });
  if (asRes.status < 200 || asRes.status >= 300) {
    throw new OauthFlowError(`Authorization Server Metadata fetch failed (HTTP ${asRes.status})`);
  }
  return { metadata: parseAuthorizationServerMetadata(asRes.bodyText) };
}

async function registerClient(registrationEndpoint: string, redirectUri: string) {
  const res = await oauthHttpRequest(
    "POST",
    registrationEndpoint,
    { "Content-Type": "application/json", Accept: "application/json" },
    buildRegistrationRequestBody(redirectUri),
  );
  if (res.status < 200 || res.status >= 300) {
    throw new OauthFlowError(`Dynamic client registration failed (HTTP ${res.status})`);
  }
  let json: unknown;
  try {
    json = JSON.parse(res.bodyText);
  } catch {
    throw new OauthFlowError("Dynamic client registration returned an unparseable response");
  }
  const reg = json as { client_id?: string; client_secret?: string };
  if (!reg.client_id) {
    throw new OauthFlowError("Dynamic client registration response is missing client_id");
  }
  return { clientId: reg.client_id, clientSecret: reg.client_secret };
}

/**
 * Runs the full MCP OAuth 2.1 authorization code flow (PRM discovery → AS metadata
 * discovery → DCR or manual client → PKCE + loopback redirect → token exchange),
 * persists the result, and returns it. Throws `OauthManualClientRequiredError` if
 * the AS has no `registration_endpoint` and no manual client was supplied — the
 * caller should collect one from the user and retry with `opts.manualClient`.
 */
export async function runAuthorizationCodeFlow(
  serverUrl: string,
  wwwAuthenticate: string | undefined,
  opts: RunAuthorizationCodeFlowOptions = {},
): Promise<McpOauthRecord> {
  const canonical = canonicalizeServerUrl(serverUrl);
  const notify = opts.onStatus ?? (() => {});

  notify("Discovering authorization server…");
  const authServer = await discoverAuthorizationServer(serverUrl, wwwAuthenticate);

  notify("Opening redirect listener…");
  const loopback = await openOauthLoopback();
  const redirectUri = `http://127.0.0.1:${loopback.port}/callback`;

  let clientId: string;
  let clientSecret: string | undefined;
  let manualClientId: boolean;
  let scope: string | undefined;

  if (opts.manualClient) {
    clientId = opts.manualClient.clientId;
    clientSecret = opts.manualClient.clientSecret;
    scope = opts.manualClient.scope;
    manualClientId = true;
  } else if (authServer.metadata.registration_endpoint) {
    notify("Registering client…");
    const registered = await registerClient(authServer.metadata.registration_endpoint, redirectUri);
    clientId = registered.clientId;
    clientSecret = registered.clientSecret;
    manualClientId = false;
  } else {
    throw new OauthManualClientRequiredError(
      "This authorization server has no registration_endpoint — enter a manually-registered client id.",
    );
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  const authUrl = buildAuthorizationUrl({
    authorizationEndpoint: authServer.metadata.authorization_endpoint,
    clientId,
    redirectUri,
    codeChallenge,
    state,
    resource: canonical,
    scope,
  });

  notify("Waiting for browser authorization…");
  await openExternalUrl(authUrl);
  const result = await waitForOauthLoopback(loopback.listenerId, AUTHORIZATION_TIMEOUT_MS);

  if (result.error) {
    throw new OauthFlowError(`Authorization was denied: ${result.error}`);
  }
  if (!result.code) {
    throw new OauthFlowError("Authorization redirect did not include a code");
  }
  if (result.state !== state) {
    throw new OauthFlowError("Authorization redirect state did not match — discarding response");
  }

  notify("Exchanging authorization code for a token…");
  const token = await tokenRequest(
    authServer.metadata.token_endpoint,
    buildTokenRequestBody({
      code: result.code,
      redirectUri,
      clientId,
      codeVerifier,
      resource: canonical,
    }),
    clientId,
    clientSecret,
  );

  const record = toRecord(
    canonical,
    authServer,
    clientId,
    clientSecret,
    manualClientId,
    scope,
    token,
  );
  await saveMcpOauth(record);
  return record;
}

/** Refreshes an access token using the stored refresh_token. Throws if none is stored. */
export async function refreshAccessToken(record: McpOauthRecord): Promise<McpOauthRecord> {
  if (!record.refreshToken) {
    throw new OauthFlowError("No refresh token available for this server");
  }
  const token = await tokenRequest(
    record.tokenEndpoint,
    buildRefreshRequestBody({
      refreshToken: record.refreshToken,
      clientId: record.clientId,
      resource: record.serverUrl,
    }),
    record.clientId,
    record.clientSecret,
  );
  const updated: McpOauthRecord = {
    ...record,
    accessToken: token.access_token,
    // OAuth 2.1 §4.3.1 — public clients get rotated refresh tokens; keep the old
    // one only if the AS didn't issue a new one.
    refreshToken: token.refresh_token ?? record.refreshToken,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
  };
  await saveMcpOauth(updated);
  return updated;
}
