import { describe, expect, it } from "vitest";
import type { RequestConfig } from "@/shared/types";
import { collectPaletteItems, hostOf, relativeTime, searchPalette } from "./search";

function makeConfig(over: Partial<RequestConfig> = {}): RequestConfig {
  return {
    name: "t",
    method: "GET",
    url: "",
    params: [],
    headers: [],
    bodyType: "none",
    body: "",
    formData: [],
    multipart: [],
    file: null,
    auth: {
      type: "none",
      username: "",
      password: "",
      token: "",
      apiKey: "",
      apiValue: "",
      apiAddTo: "header",
    },
    ...over,
  };
}

describe("collectPaletteItems", () => {
  it("flattens history, drafts, and nested collection requests", () => {
    const items = collectPaletteItems({
      history: [
        {
          id: 1,
          name: "Get users",
          method: "GET",
          url: "https://api.example.com/users",
          statusCode: 200,
          responseTime: 12,
          timestamp: 1000,
          request: makeConfig({ url: "https://api.example.com/users" }),
        },
      ],
      drafts: [makeConfig({ name: "Draft one", url: "https://api.example.com/draft" })],
      collections: [
        {
          id: "c1",
          name: "My API",
          createdAt: 0,
          root: [
            {
              id: "f1",
              type: "folder",
              name: "users",
              children: [
                {
                  id: "r1",
                  type: "request",
                  name: "list",
                  method: "GET",
                  url: "https://api.example.com/users",
                  request: makeConfig({ url: "https://api.example.com/users" }),
                },
              ],
            },
          ],
        },
      ],
    });

    expect(items).toHaveLength(3);
    expect(items.find((i) => i.source === "history")?.sourceLabel).toBe("History");
    expect(items.find((i) => i.source === "draft")?.sourceLabel).toBe("Draft");
    const nested = items.find((i) => i.source === "collection");
    expect(nested?.sourceLabel).toBe("My API");
    expect(nested?.url).toBe("https://api.example.com/users");
    expect(nested?.collectionId).toBe("c1");
    expect(nested?.nodeId).toBe("r1");
  });
});

describe("searchPalette", () => {
  const items = collectPaletteItems({
    history: [
      {
        id: 1,
        name: "Old request",
        method: "GET",
        url: "https://api.example.com/old",
        statusCode: 200,
        responseTime: 5,
        timestamp: 100,
        request: makeConfig({ url: "https://api.example.com/old" }),
      },
      {
        id: 2,
        name: "Recent request",
        method: "GET",
        url: "https://api.example.com/recent",
        statusCode: 200,
        responseTime: 5,
        timestamp: 900,
        request: makeConfig({ url: "https://api.example.com/recent" }),
      },
    ],
    drafts: [
      makeConfig({
        name: "Draft with secret body",
        url: "https://other.example.com/thing",
        body: "supersecretpayload",
        bodyType: "application/json",
      }),
    ],
    collections: [],
  });

  it("returns nothing for an empty query", () => {
    expect(searchPalette(items, "")).toEqual([]);
  });

  it("ranks exact/prefix URL matches above name/body matches", () => {
    const results = searchPalette(items, "https://api.example.com/recent");
    expect(results[0].url).toBe("https://api.example.com/recent");
    expect(results[0].tier).toBe(0);
  });

  it("matches body text as a low-priority tier", () => {
    const results = searchPalette(items, "supersecretpayload");
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe("draft");
  });

  it("breaks ties within the same tier by recency", () => {
    const results = searchPalette(items, "api.example.com");
    const historyResults = results.filter((r) => r.source === "history");
    expect(historyResults.map((r) => r.name)).toEqual(["Recent request", "Old request"]);
  });
});

describe("searchPalette — snapshot bodies (Phase 6)", () => {
  it("matches a history snapshot body, ranked below request-field matches", () => {
    const items = collectPaletteItems({
      history: [
        {
          id: 1,
          name: "Snapshot match",
          method: "GET",
          url: "https://api.example.com/orders",
          statusCode: 200,
          responseTime: 5,
          timestamp: 100,
          request: makeConfig({ url: "https://api.example.com/orders" }),
          snapshot: {
            status: 200,
            statusText: "OK",
            contentType: "application/json",
            size: 20,
            bodyText: '{"marker":"zzz-snapshot"}',
            truncated: false,
          },
        },
        {
          id: 2,
          name: "Body-field match",
          method: "GET",
          url: "https://api.example.com/other",
          statusCode: 200,
          responseTime: 5,
          timestamp: 100,
          request: makeConfig({ url: "https://api.example.com/other", body: "zzz-snapshot" }),
        },
      ],
      drafts: [],
      collections: [],
    });

    const results = searchPalette(items, "zzz-snapshot");
    expect(results).toHaveLength(2);
    // Request body-field match (tier 5) ranks above the snapshot-body match (tier 6).
    expect(results[0].name).toBe("Body-field match");
    expect(results[1].name).toBe("Snapshot match");
    expect(results[1].tier).toBe(6);
  });
});

describe("hostOf", () => {
  it("extracts the hostname", () => {
    expect(hostOf("https://api.example.com/v1/users?x=1")).toBe("api.example.com");
  });

  it("falls back gracefully on unparseable input", () => {
    expect(hostOf("not a url")).toBe("not a url");
  });
});

describe("relativeTime", () => {
  it("formats minutes/hours/days ago", () => {
    const now = 1_000_000_000;
    expect(relativeTime(now - 30_000, now)).toBe("just now");
    expect(relativeTime(now - 5 * 60_000, now)).toBe("5m ago");
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe("3h ago");
    expect(relativeTime(now - 2 * 86_400_000, now)).toBe("2d ago");
  });
});
