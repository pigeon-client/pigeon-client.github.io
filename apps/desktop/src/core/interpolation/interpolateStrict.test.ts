import { describe, expect, it } from "vitest";
import { interpolateStrict, UnresolvedVariablesError } from "./interpolateStrict";

const resolve = (name: string) => (name === "host" ? "mcp.example.com" : undefined);

describe("interpolateStrict", () => {
  it("resolves a known variable", () => {
    expect(interpolateStrict("https://{{host}}/mcp", resolve)).toBe("https://mcp.example.com/mcp");
  });

  it("throws on an unresolved variable", () => {
    expect(() => interpolateStrict("https://{{missing}}/mcp", resolve)).toThrow(
      UnresolvedVariablesError,
    );
  });
});
