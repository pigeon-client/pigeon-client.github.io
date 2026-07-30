import { describe, expect, it } from "vitest";
import type { RequestConfig } from "@/shared/types";
import { generateCurl, shellQuote } from "./lib/generateCurl";
import { parseCurl } from "./services/curlService";

function baseConfig(over: Partial<RequestConfig> = {}): RequestConfig {
  return {
    name: "t",
    method: "GET",
    url: "https://api.example.com/users",
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

describe("shellQuote", () => {
  it("wraps in single quotes", () => {
    expect(shellQuote("hello")).toBe("'hello'");
  });

  it("escapes embedded single quotes for POSIX sh", () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});

describe("generateCurl — standard form", () => {
  it("emits a simple GET with single-quoted URL", () => {
    const curl = generateCurl(baseConfig());
    expect(curl).toBe("curl 'https://api.example.com/users'");
  });

  it("adds Content-Type for JSON body (curl -d alone would send form-urlencoded)", () => {
    const curl = generateCurl(
      baseConfig({
        method: "POST",
        bodyType: "application/json",
        body: '{"name":"Ada"}',
      }),
    );
    expect(curl).toContain("-X POST");
    expect(curl).toContain("-H 'Content-Type: application/json'");
    expect(curl).toContain('--data-raw \'{"name":"Ada"}\'');
    expect(curl.endsWith("'https://api.example.com/users'")).toBe(true);
  });

  it("does not duplicate Content-Type if the user already set it", () => {
    const curl = generateCurl(
      baseConfig({
        method: "POST",
        bodyType: "application/json",
        body: "{}",
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
      }),
    );
    expect(curl.match(/Content-Type/g)?.length).toBe(1);
  });

  it('shell-escapes header values so $ and " survive the terminal', () => {
    const curl = generateCurl(
      baseConfig({
        headers: [{ key: "X-Msg", value: 'say "$HOME"', enabled: true }],
      }),
    );
    expect(curl).toContain("-H 'X-Msg: say \"$HOME\"'");
    // Must not use double quotes around the header (would expand $HOME)
    expect(curl).not.toMatch(/-H "X-Msg:/);
  });

  it("applies enabled query params to the URL", () => {
    const curl = generateCurl(
      baseConfig({
        url: "https://api.example.com/users",
        params: [
          { key: "page", value: "2", enabled: true },
          { key: "q", value: "a b", enabled: true },
          { key: "skip", value: "1", enabled: false },
        ],
      }),
    );
    expect(curl).toContain("'https://api.example.com/users?page=2&q=a%20b'");
    expect(curl).not.toContain("skip=");
  });

  it("exports bearer auth as Authorization header", () => {
    const curl = generateCurl(
      baseConfig({
        auth: {
          type: "bearer",
          username: "",
          password: "",
          token: "tok_123",
          apiKey: "",
          apiValue: "",
          apiAddTo: "header",
        },
      }),
    );
    expect(curl).toContain("-H 'Authorization: Bearer tok_123'");
  });

  it("exports basic auth with -u", () => {
    const curl = generateCurl(
      baseConfig({
        auth: {
          type: "basic",
          username: "ada",
          password: "se'cret",
          token: "",
          apiKey: "",
          apiValue: "",
          apiAddTo: "header",
        },
      }),
    );
    expect(curl).toContain("-u 'ada:se'\\''cret'");
  });

  it("exports api-key as header", () => {
    const curl = generateCurl(
      baseConfig({
        auth: {
          type: "api-key",
          username: "",
          password: "",
          token: "",
          apiKey: "X-Api-Key",
          apiValue: "secret",
          apiAddTo: "header",
        },
      }),
    );
    expect(curl).toContain("-H 'X-Api-Key: secret'");
  });

  it("exports urlencoded fields with --data-urlencode", () => {
    const curl = generateCurl(
      baseConfig({
        method: "POST",
        bodyType: "application/x-www-form-urlencoded",
        formData: [
          { key: "name", value: "Ada Lovelace", enabled: true },
          { key: "off", value: "x", enabled: false },
        ],
      }),
    );
    expect(curl).toContain("--data-urlencode 'name=Ada Lovelace'");
    expect(curl).toContain("-H 'Content-Type: application/x-www-form-urlencoded'");
    expect(curl).not.toContain("off=");
  });

  it("exports multipart with -F", () => {
    const curl = generateCurl(
      baseConfig({
        method: "POST",
        bodyType: "multipart/form-data",
        multipart: [
          { key: "title", value: "hi", enabled: true },
          { key: "file", value: "", enabled: true, isFile: true, fileName: "a.png" },
        ],
      }),
    );
    expect(curl).toContain("-F 'title=hi'");
    expect(curl).toContain("-F 'file=@a.png'");
    expect(curl).not.toContain("Content-Type");
  });

  it("uses --data-raw so a body starting with @ is not read as a file", () => {
    const curl = generateCurl(
      baseConfig({
        method: "POST",
        bodyType: "text/plain",
        body: "@not-a-file",
      }),
    );
    expect(curl).toContain("--data-raw '@not-a-file'");
    expect(curl).not.toMatch(/(?:^|\s)-d\s/);
  });

  it("exports a binary body with --data-binary @file", () => {
    const curl = generateCurl(
      baseConfig({
        method: "POST",
        bodyType: "application/pdf",
        file: new File([], "report.pdf"),
      }),
    );
    expect(curl).toContain("--data-binary '@report.pdf'");
  });

  it("falls back to a generic filename when --data-binary has no file", () => {
    const curl = generateCurl(baseConfig({ method: "POST", bodyType: "application/octet-stream" }));
    expect(curl).toContain("--data-binary '@file.bin'");
  });

  it("never exports a body for GET (RFC 9110) so re-import stays GET", () => {
    const curl = generateCurl(
      baseConfig({
        method: "GET",
        bodyType: "application/json",
        body: '{"oops":true}',
      }),
    );
    expect(curl).toBe("curl 'https://api.example.com/users'");
    expect(curl).not.toContain("--data-raw");
    expect(curl).not.toContain("-X");
    const parsed = parseCurl(curl);
    expect(parsed?.method).toBe("GET");
  });

  it("emits -X QUERY with a body", () => {
    const curl = generateCurl(
      baseConfig({
        method: "QUERY",
        bodyType: "application/json",
        body: '{"q":"select 1"}',
      }),
    );
    expect(curl).toContain("-X QUERY");
    expect(curl).toContain("--data-raw");
    expect(curl).toContain("Content-Type: application/json");
  });
});

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
  it("survives config → curl → config for method/url/header/body", () => {
    const config = baseConfig({
      method: "POST",
      url: "https://api.example.com/users",
      headers: [{ key: "X-Token", value: "abc", enabled: true }],
      bodyType: "application/json",
      body: '{"a":1}',
    });

    const curl = generateCurl(config);
    expect(curl.startsWith("curl")).toBe(true);

    const parsed = parseCurl(curl);
    expect(parsed?.method).toBe("POST");
    expect(parsed?.url).toContain("api.example.com/users");
    expect(parsed?.headers?.some((h) => h.key === "X-Token" && h.value === "abc")).toBe(true);
    expect(parsed?.body).toMatch(/"a"\s*:\s*1/);
  });
});
