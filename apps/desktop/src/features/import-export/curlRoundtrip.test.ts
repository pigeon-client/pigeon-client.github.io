import { describe, expect, it } from "vitest";
import type { RequestConfig } from "@/shared/types";
import { generateCurl } from "./lib/generateCurl";
import { parseCurl } from "./services/curlService";

function baseConfig(): RequestConfig {
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
  };
}

describe("parseCurl", () => {
  it("parses method, url, headers and body", () => {
    const parsed = parseCurl(
      `curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{"name":"Ada"}'`,
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.method).toBe("POST");
    expect(parsed?.url).toContain("api.example.com/users");
    expect(parsed?.headers?.some((h) => h.key === "Content-Type")).toBe(true);
    expect(parsed?.body).toContain("Ada");
  });

  it("returns null for non-curl input", () => {
    expect(parseCurl("not a curl command")).toBeNull();
  });
});

describe("cURL round-trip", () => {
  it("survives config → curl → config for method/url/header", () => {
    const config: RequestConfig = {
      ...baseConfig(),
      method: "POST",
      url: "https://api.example.com/users",
      headers: [{ key: "X-Token", value: "abc", enabled: true }],
      bodyType: "application/json",
      body: '{"a":1}',
    };

    const curl = generateCurl(config);
    expect(curl.startsWith("curl")).toBe(true);

    const parsed = parseCurl(curl);
    expect(parsed?.method).toBe("POST");
    expect(parsed?.url).toContain("api.example.com/users");
    expect(parsed?.headers?.some((h) => h.key === "X-Token" && h.value === "abc")).toBe(true);
    expect(parsed?.body).toContain('"a":1');
  });
});
