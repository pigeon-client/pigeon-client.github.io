import { describe, expect, it } from "vitest";
import { canonicalizeServerUrl, InvalidServerUriError } from "./canonicalUri";

describe("canonicalizeServerUrl", () => {
  it.each([
    ["https://mcp.example.com/mcp", "https://mcp.example.com/mcp"],
    ["https://mcp.example.com", "https://mcp.example.com"],
    ["https://mcp.example.com/", "https://mcp.example.com"],
    ["https://mcp.example.com:8443", "https://mcp.example.com:8443"],
    ["https://mcp.example.com/server/mcp", "https://mcp.example.com/server/mcp"],
    ["HTTPS://MCP.Example.com/mcp", "https://mcp.example.com/mcp"],
  ])("canonicalizes %s -> %s", (input, expected) => {
    expect(canonicalizeServerUrl(input)).toBe(expected);
  });

  it("rejects URIs with a fragment", () => {
    expect(() => canonicalizeServerUrl("https://mcp.example.com#fragment")).toThrow(
      InvalidServerUriError,
    );
  });

  it("rejects URIs missing a scheme", () => {
    expect(() => canonicalizeServerUrl("mcp.example.com")).toThrow(InvalidServerUriError);
  });
});
