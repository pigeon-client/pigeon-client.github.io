import { describe, expect, it } from "vitest";
import {
  buildAuthorizationUrl,
  buildRefreshRequestBody,
  buildRegistrationRequestBody,
  buildTokenRequestBody,
} from "./OauthFlow";

describe("buildAuthorizationUrl", () => {
  it("includes PKCE, state, and the resource parameter", () => {
    const url = buildAuthorizationUrl({
      authorizationEndpoint: "https://as.example.com/authorize",
      clientId: "client-123",
      redirectUri: "http://127.0.0.1:4321/callback",
      codeChallenge: "challenge-value",
      state: "state-value",
      resource: "https://mcp.example.com",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("client-123");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:4321/callback");
    expect(parsed.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("state")).toBe("state-value");
    expect(parsed.searchParams.get("resource")).toBe("https://mcp.example.com");
    expect(parsed.searchParams.has("scope")).toBe(false);
  });

  it("omits scope when not provided and includes it when provided", () => {
    const withScope = buildAuthorizationUrl({
      authorizationEndpoint: "https://as.example.com/authorize",
      clientId: "c",
      redirectUri: "http://127.0.0.1:1/callback",
      codeChallenge: "x",
      state: "y",
      resource: "https://mcp.example.com",
      scope: "tools:read",
    });
    expect(new URL(withScope).searchParams.get("scope")).toBe("tools:read");
  });
});

describe("buildTokenRequestBody", () => {
  it("form-encodes the authorization_code grant with the resource parameter", () => {
    const body = buildTokenRequestBody({
      code: "auth-code",
      redirectUri: "http://127.0.0.1:4321/callback",
      clientId: "client-123",
      codeVerifier: "verifier-value",
      resource: "https://mcp.example.com",
    });
    const params = new URLSearchParams(body);
    expect(params.get("grant_type")).toBe("authorization_code");
    expect(params.get("code")).toBe("auth-code");
    expect(params.get("code_verifier")).toBe("verifier-value");
    expect(params.get("resource")).toBe("https://mcp.example.com");
  });
});

describe("buildRefreshRequestBody", () => {
  it("form-encodes the refresh_token grant", () => {
    const body = buildRefreshRequestBody({
      refreshToken: "refresh-value",
      clientId: "client-123",
      resource: "https://mcp.example.com",
    });
    const params = new URLSearchParams(body);
    expect(params.get("grant_type")).toBe("refresh_token");
    expect(params.get("refresh_token")).toBe("refresh-value");
    expect(params.get("resource")).toBe("https://mcp.example.com");
  });
});

describe("buildRegistrationRequestBody", () => {
  it("registers a public client with PKCE (no auth method)", () => {
    const body = JSON.parse(buildRegistrationRequestBody("http://127.0.0.1:4321/callback"));
    expect(body.redirect_uris).toEqual(["http://127.0.0.1:4321/callback"]);
    expect(body.token_endpoint_auth_method).toBe("none");
    expect(body.grant_types).toContain("authorization_code");
    expect(body.response_types).toEqual(["code"]);
  });
});
