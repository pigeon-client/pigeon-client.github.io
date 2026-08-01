import { describe, expect, it } from "vitest";
import {
  buildAuthorizationServerMetadataUrl,
  buildDefaultProtectedResourceMetadataUrl,
  MetadataDiscoveryError,
  parseAuthorizationServerMetadata,
  parseProtectedResourceMetadata,
  parseWwwAuthenticate,
} from "./metadata";

describe("parseWwwAuthenticate", () => {
  it("extracts resource_metadata from a Bearer challenge", () => {
    const header =
      'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"';
    expect(parseWwwAuthenticate(header)).toBe(
      "https://mcp.example.com/.well-known/oauth-protected-resource",
    );
  });

  it("returns null for missing or malformed headers", () => {
    expect(parseWwwAuthenticate(undefined)).toBeNull();
    expect(parseWwwAuthenticate("Bearer")).toBeNull();
  });
});

describe("buildDefaultProtectedResourceMetadataUrl", () => {
  it("appends the well-known path to the server origin", () => {
    expect(buildDefaultProtectedResourceMetadataUrl("https://mcp.example.com/mcp")).toBe(
      "https://mcp.example.com/.well-known/oauth-protected-resource",
    );
  });
});

describe("buildAuthorizationServerMetadataUrl", () => {
  it("uses the bare well-known path when the issuer has no path", () => {
    expect(buildAuthorizationServerMetadataUrl("https://as.example.com")).toBe(
      "https://as.example.com/.well-known/oauth-authorization-server",
    );
  });

  it("inserts the well-known path before the issuer's path component", () => {
    expect(buildAuthorizationServerMetadataUrl("https://as.example.com/tenant1")).toBe(
      "https://as.example.com/.well-known/oauth-authorization-server/tenant1",
    );
  });
});

describe("parseProtectedResourceMetadata", () => {
  it("parses a valid document", () => {
    const body = JSON.stringify({
      resource: "https://mcp.example.com",
      authorization_servers: ["https://as.example.com"],
    });
    expect(parseProtectedResourceMetadata(body).authorization_servers).toEqual([
      "https://as.example.com",
    ]);
  });

  it("rejects a document with no authorization_servers", () => {
    expect(() => parseProtectedResourceMetadata(JSON.stringify({ resource: "x" }))).toThrow(
      MetadataDiscoveryError,
    );
  });

  it("rejects invalid JSON", () => {
    expect(() => parseProtectedResourceMetadata("not json")).toThrow(MetadataDiscoveryError);
  });
});

describe("parseAuthorizationServerMetadata", () => {
  it("parses a valid document", () => {
    const body = JSON.stringify({
      issuer: "https://as.example.com",
      authorization_endpoint: "https://as.example.com/authorize",
      token_endpoint: "https://as.example.com/token",
      registration_endpoint: "https://as.example.com/register",
    });
    const metadata = parseAuthorizationServerMetadata(body);
    expect(metadata.authorization_endpoint).toBe("https://as.example.com/authorize");
    expect(metadata.registration_endpoint).toBe("https://as.example.com/register");
  });

  it("rejects a document missing required endpoints", () => {
    expect(() =>
      parseAuthorizationServerMetadata(JSON.stringify({ issuer: "https://as.example.com" })),
    ).toThrow(MetadataDiscoveryError);
  });
});
