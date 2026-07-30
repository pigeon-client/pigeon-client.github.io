import { describe, expect, it } from "vitest";
import type { Environment } from "@/features/environments";
import { interpolateStrict, McpUnresolvedVariablesError, parseHeaderLines } from "./interpolate";

const env: Environment = {
  id: "e1",
  name: "Dev",
  variables: [{ key: "host", value: "mcp.example.com", enabled: true, secret: false }],
  isProduction: false,
};

describe("interpolateStrict", () => {
  it("resolves a known variable", () => {
    expect(interpolateStrict("https://{{host}}/mcp", env, [])).toBe("https://mcp.example.com/mcp");
  });

  it("throws on an unresolved variable", () => {
    expect(() => interpolateStrict("https://{{missing}}/mcp", env, [])).toThrow(
      McpUnresolvedVariablesError,
    );
  });
});

describe("parseHeaderLines", () => {
  it("parses Key: Value lines and skips blanks/malformed ones", () => {
    const headers = parseHeaderLines(
      "Authorization: Bearer abc\n\nX-Custom:  value with spaces  \nmalformed-line",
    );
    expect(headers).toEqual({ Authorization: "Bearer abc", "X-Custom": "value with spaces" });
  });
});
