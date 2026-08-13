import { describe, expect, it } from "vitest";
import {
  maskVarTokensForHighlight,
  parseVarToken,
  splitVarTokens,
} from "@/shared/lib/varTokenSegments";

describe("varTokenSegments", () => {
  it("splits quoted and bare tokens", () => {
    expect(splitVarTokens('{"a":"{{x}}", "b": {{Count}}}')).toEqual([
      '{"a":"',
      "{{x}}",
      '", "b": ',
      "{{Count}}",
      "}",
    ]);
  });

  it("parses token names", () => {
    expect(parseVarToken("{{Count}}")).toBe("Count");
    expect(parseVarToken("plain")).toBeNull();
  });

  it("masks tokens without changing length", () => {
    const body = '{\n  "count": {{Count}}\n}';
    const masked = maskVarTokensForHighlight(body);
    expect(masked.length).toBe(body.length);
    expect(masked).not.toContain("{{");
  });
});
