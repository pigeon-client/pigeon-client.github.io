import { describe, expect, it } from "vitest";
import {
  formatJsonPreservingVars,
  formatVarToken,
  isInsideJsonString,
  isJsonLiteralValue,
  normalizeLooseJson,
  shouldExpandJsonBlock,
  shouldWrapJsonString,
  stripTrailingCommas,
} from "./jsonEditContext";

describe("isInsideJsonString", () => {
  it("detects positions inside and outside strings", () => {
    const s = '{ "a": "hello", "b": 1 }';
    const hello = s.indexOf("hello");
    const bKey = s.indexOf('"b"');
    expect(isInsideJsonString(s, hello)).toBe(true);
    expect(isInsideJsonString(s, 0)).toBe(false);
    expect(isInsideJsonString(s, bKey)).toBe(false);
  });

  it("honours escaped quotes", () => {
    const s = '{ "a": "say \\"hi\\"" }';
    const hi = s.indexOf("hi");
    expect(isInsideJsonString(s, hi)).toBe(true);
  });
});

describe("shouldWrapJsonString", () => {
  it("wraps bare object values", () => {
    const s = '{ "email": {{em';
    const start = s.indexOf("{{");
    expect(shouldWrapJsonString(s, start, s.length)).toBe(true);
  });

  it("skips when already inside a string", () => {
    const s = '{ "email": "{{em';
    const start = s.indexOf("{{", s.indexOf('"email"'));
    expect(shouldWrapJsonString(s, start, s.length)).toBe(false);
  });

  it("skips quotes for numeric env values", () => {
    const s = '{ "count": {{c';
    const start = s.indexOf("{{");
    expect(shouldWrapJsonString(s, start, s.length, "42")).toBe(false);
    expect(shouldWrapJsonString(s, start, s.length, "3.14")).toBe(false);
  });

  it("skips quotes for boolean and null env values", () => {
    const s = '{ "flag": {{f';
    const start = s.indexOf("{{");
    expect(shouldWrapJsonString(s, start, s.length, "true")).toBe(false);
    expect(shouldWrapJsonString(s, start, s.length, "false")).toBe(false);
    expect(shouldWrapJsonString(s, start, s.length, "null")).toBe(false);
  });
});

describe("shouldExpandJsonBlock", () => {
  it("expands at root and after object openers", () => {
    expect(shouldExpandJsonBlock("", 0)).toBe(true);
    expect(shouldExpandJsonBlock('"a": ', 5)).toBe(true);
    expect(shouldExpandJsonBlock("[", 1)).toBe(true);
  });

  it("skips inside strings and for {{var}}", () => {
    expect(shouldExpandJsonBlock('"a": "{{', 7)).toBe(false);
    expect(shouldExpandJsonBlock("{{", 2)).toBe(false);
    expect(shouldExpandJsonBlock("{\n  ", 4)).toBe(false);
  });
});

describe("isJsonLiteralValue", () => {
  it("recognises JSON non-string literals", () => {
    expect(isJsonLiteralValue("42")).toBe(true);
    expect(isJsonLiteralValue("3.14")).toBe(true);
    expect(isJsonLiteralValue("true")).toBe(true);
    expect(isJsonLiteralValue("null")).toBe(true);
    expect(isJsonLiteralValue("hello")).toBe(false);
    expect(isJsonLiteralValue("user@example.com")).toBe(false);
  });
});

describe("formatVarToken", () => {
  it("adds JSON quotes when requested", () => {
    expect(formatVarToken("email", true)).toBe('"{{email}}"');
    expect(formatVarToken("email", false)).toBe("{{email}}");
  });
});

describe("formatJsonPreservingVars", () => {
  it("formats mixed quoted and bare variable values", () => {
    const input = '{"email":"{{email}}","count":{{count}},"ok":true}';
    expect(formatJsonPreservingVars(input)).toBe(
      '{\n  "email": "{{email}}",\n  "count": {{count}},\n  "ok": true\n}',
    );
  });

  it("preserves boolean/null literal vars without quotes", () => {
    const input = '{"enabled":{{enabled}},"value":{{value}}}';
    expect(formatJsonPreservingVars(input)).toBe(
      '{\n  "enabled": {{enabled}},\n  "value": {{value}}\n}',
    );
  });

  it("drops trailing commas before closing braces", () => {
    const input = `{
  "name": "{{$email}}",
  "nasdfdgme": "jsdf",
  "count": {{Count}},
}`;
    expect(formatJsonPreservingVars(input)).toBe(
      '{\n  "name": "{{$email}}",\n  "nasdfdgme": "jsdf",\n  "count": {{Count}}\n}',
    );
  });
});

describe("stripTrailingCommas", () => {
  it("removes commas before } and ] outside strings", () => {
    expect(stripTrailingCommas('{ "a": 1, }')).toBe('{ "a": 1 }');
    expect(stripTrailingCommas("[1, 2, ]")).toBe("[1, 2 ]");
    expect(stripTrailingCommas('{ "a": "comma, inside", }')).toBe('{ "a": "comma, inside" }');
  });
});

describe("normalizeLooseJson", () => {
  it("quotes bare keys and keeps double-quoted values", () => {
    expect(normalizeLooseJson('{  name: "John", age: 30 }')).toBe('{  "name": "John", "age": 30 }');
  });

  it("converts single-quoted values to double quotes", () => {
    expect(normalizeLooseJson("{ name: 'John' }")).toBe('{ "name": "John" }');
  });

  it("handles mixed bare keys and single-quoted values", () => {
    const input = "{\n  name: 'John',\n  age: 30\n}";
    expect(normalizeLooseJson(input)).toBe('{\n  "name": "John",\n  "age": 30\n}');
  });
});

describe("formatJsonPreservingVars with loose JSON", () => {
  it("formats pasted JS-style objects", () => {
    const input = "{\n  name: 'John',\n  age: 30\n}";
    expect(formatJsonPreservingVars(input)).toBe('{\n  "name": "John",\n  "age": 30\n}');
  });
});
