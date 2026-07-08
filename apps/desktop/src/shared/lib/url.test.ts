import { describe, expect, it } from "vitest";
import { applyParamsToUrl, buildQueryString, parseUrl, splitUrlQuery, stripQuery } from "./url";

describe("parseUrl", () => {
  it("expands a bare port to localhost", () => {
    expect(parseUrl(":3000")).toBe("http://localhost:3000");
    expect(parseUrl(":3000/api?x=1")).toBe("http://localhost:3000/api?x=1");
  });

  it("respects an existing protocol", () => {
    expect(parseUrl("https://api.example.com")).toBe("https://api.example.com");
  });

  it("defaults to http for a bare host", () => {
    expect(parseUrl("api.example.com")).toBe("http://api.example.com");
  });
});

describe("stripQuery", () => {
  it("drops the query but keeps the hash", () => {
    expect(stripQuery("http://x/y?a=1")).toBe("http://x/y");
    expect(stripQuery("http://x/y?a=1#frag")).toBe("http://x/y#frag");
    expect(stripQuery("http://x/y")).toBe("http://x/y");
  });
});

describe("splitUrlQuery", () => {
  it("splits base and decoded pairs", () => {
    const { base, params } = splitUrlQuery("localhost:3000/api?a=1&b=hello%20world");
    expect(base).toBe("localhost:3000/api");
    expect(params).toEqual([
      { key: "a", value: "1" },
      { key: "b", value: "hello world" },
    ]);
  });

  it("handles a valueless key", () => {
    expect(splitUrlQuery("x?flag").params).toEqual([{ key: "flag", value: "" }]);
  });

  it("returns no params when there is no query", () => {
    expect(splitUrlQuery("x").params).toEqual([]);
  });
});

describe("buildQueryString", () => {
  it("encodes only enabled, keyed params", () => {
    expect(
      buildQueryString([
        { key: "a", value: "1", enabled: true },
        { key: "b", value: "x y", enabled: true },
        { key: "c", value: "2", enabled: false },
        { key: "", value: "3", enabled: true },
      ]),
    ).toBe("a=1&b=x%20y");
  });
});

describe("applyParamsToUrl", () => {
  it("round-trips a query out of and back into a URL", () => {
    const { base, params } = splitUrlQuery("localhost:3000/todos/1?lmsd=kmv");
    const kv = params.map((p) => ({ ...p, enabled: true }));
    expect(applyParamsToUrl(base, kv)).toBe("localhost:3000/todos/1?lmsd=kmv");
  });

  it("drops the query entirely when there are no params", () => {
    expect(applyParamsToUrl("http://x/y?a=1", [])).toBe("http://x/y");
  });

  it("keeps a trailing hash", () => {
    expect(applyParamsToUrl("http://x/y#f", [{ key: "a", value: "1", enabled: true }])).toBe(
      "http://x/y?a=1#f",
    );
  });
});
