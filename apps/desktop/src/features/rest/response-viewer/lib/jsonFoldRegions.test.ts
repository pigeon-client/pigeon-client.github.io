import { describe, expect, it } from "vitest";
import { collapsedLineText, findJsonFoldRegions, isLineHidden } from "./jsonFoldRegions";

describe("findJsonFoldRegions", () => {
  it("finds the root object block in pretty JSON", () => {
    const code = `{
  "a": 1,
  "b": {
    "c": 2
  }
}`;
    const regions = findJsonFoldRegions(code);
    expect(regions).toContainEqual({ startLine: 0, endLine: 5 });
    expect(regions).toContainEqual({ startLine: 2, endLine: 4 });
  });

  it("hides inner lines when a block is collapsed", () => {
    const code = `{
  "a": 1
}`;
    const regions = findJsonFoldRegions(code);
    const collapsed = new Set([0]);
    expect(isLineHidden(1, collapsed, regions)).toBe(true);
    expect(isLineHidden(2, collapsed, regions)).toBe(true);
    expect(collapsedLineText("{", regions[0], code.split("\n"))).toBe("{ … }");
  });

  it("advances the line counter for raw newlines inside strings", () => {
    // Invalid JSON, but pretty-printers and the old O(n²) loop both see real `\n`
    // while `inString` — skipping them used to shift later fold start lines.
    const code = `{
  "a": "hello
world",
  "b": {
    "c": 1
  }
}`;
    const regions = findJsonFoldRegions(code);
    expect(regions).toContainEqual({ startLine: 0, endLine: 6 });
    expect(regions).toContainEqual({ startLine: 3, endLine: 5 });
  });
});
