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
});
