import { describe, expect, it } from "vitest";
import type { RequestConfig } from "@/shared/types";
import { resolveRequest } from "./requestService";

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

describe("resolveRequest — query handling", () => {
  it("does not duplicate the query: params win over the URL's own query", () => {
    const config = makeConfig({
      url: "https://api.example.com/todos?a=stale",
      params: [{ key: "a", value: "fresh", enabled: true }],
    });
    const { url } = resolveRequest(config, null);
    expect(url).toBe("https://api.example.com/todos?a=fresh");
  });

  it("keeps the URL's query when there are no params", () => {
    const config = makeConfig({ url: "https://api.example.com/todos?a=1&b=2" });
    const { url } = resolveRequest(config, null);
    expect(url).toBe("https://api.example.com/todos?a=1&b=2");
  });

  it("ignores disabled and empty-key params", () => {
    const config = makeConfig({
      url: "https://api.example.com/x",
      params: [
        { key: "keep", value: "1", enabled: true },
        { key: "skip", value: "2", enabled: false },
        { key: "", value: "3", enabled: true },
      ],
    });
    const { url } = resolveRequest(config, null);
    expect(url).toBe("https://api.example.com/x?keep=1");
  });

  it("expands a bare-port URL", () => {
    const { url } = resolveRequest(makeConfig({ url: ":3000/api" }), null);
    expect(url).toBe("http://localhost:3000/api");
  });
});
