import { describe, expect, it } from "vitest";
import { skipOverClosingChar } from "./useAutoClose";

describe("skipOverClosingChar", () => {
  it("skips an adjacent closing brace", () => {
    const s = "{}";
    expect(skipOverClosingChar(s, 1, 1, "}")).toBe(2);
  });

  it("skips a closing brace on the next line", () => {
    const s = "{\n  \n}";
    expect(skipOverClosingChar(s, 4, 4, "}")).toBe(6);
  });

  it("skips after content before a closing brace", () => {
    const s = '{\n  "a": 1\n}';
    const pos = s.indexOf("1") + 1;
    expect(skipOverClosingChar(s, pos, pos, "}")).toBe(s.length);
  });
});
