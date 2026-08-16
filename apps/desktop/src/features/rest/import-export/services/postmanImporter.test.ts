import { describe, expect, it } from "vitest";
import { parsePostmanCollection } from "./postmanImporter";

function collection(items: unknown[]): string {
  return JSON.stringify({ info: { name: "Acme API" }, item: items });
}

describe("parsePostmanCollection", () => {
  it("returns null for non-JSON input", () => {
    expect(parsePostmanCollection("not json")).toBeNull();
  });

  it("returns null when there's no item array (not a collection export)", () => {
    expect(parsePostmanCollection(JSON.stringify({ info: { name: "x" } }))).toBeNull();
  });

  it("imports a flat request with query params, headers, and a JSON body", () => {
    const parsed = parsePostmanCollection(
      collection([
        {
          name: "Get order",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "https://api.acme.dev/orders/1?verbose=true",
              protocol: "https",
              host: ["api", "acme", "dev"],
              path: ["orders", "1"],
              query: [{ key: "verbose", value: "true" }],
            },
          },
        },
      ]),
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe("Acme API");
    expect(parsed?.requestCount).toBe(1);
    const node = parsed?.root[0];
    expect(node?.type).toBe("request");
    expect(node?.request?.method).toBe("GET");
    expect(node?.request?.url).toBe("https://api.acme.dev/orders/1?verbose=true");
    expect(node?.request?.params).toEqual([{ key: "verbose", value: "true", enabled: true }]);
    expect(node?.request?.headers).toEqual([
      { key: "Accept", value: "application/json", enabled: true },
    ]);
  });

  it("keeps folders nested and counts requests recursively", () => {
    const parsed = parsePostmanCollection(
      collection([
        {
          name: "Orders",
          item: [
            { name: "List", request: { method: "GET", url: "https://api.acme.dev/orders" } },
            { name: "Create", request: { method: "POST", url: "https://api.acme.dev/orders" } },
          ],
        },
      ]),
    );

    expect(parsed?.requestCount).toBe(2);
    const folder = parsed?.root[0];
    expect(folder?.type).toBe("folder");
    expect(folder?.children).toHaveLength(2);
  });

  it("maps bearer, basic, and api-key auth", () => {
    const parsed = parsePostmanCollection(
      collection([
        {
          name: "Bearer",
          request: {
            method: "GET",
            url: "https://api.acme.dev/a",
            auth: { type: "bearer", bearer: [{ key: "token", value: "abc123" }] },
          },
        },
        {
          name: "Basic",
          request: {
            method: "GET",
            url: "https://api.acme.dev/b",
            auth: {
              type: "basic",
              basic: [
                { key: "username", value: "alice" },
                { key: "password", value: "secret" },
              ],
            },
          },
        },
        {
          name: "ApiKey",
          request: {
            method: "GET",
            url: "https://api.acme.dev/c",
            auth: {
              type: "apikey",
              apikey: [
                { key: "key", value: "X-Api-Key" },
                { key: "value", value: "shh" },
              ],
            },
          },
        },
      ]),
    );

    const [bearer, basic, apiKey] = parsed?.root ?? [];
    expect(bearer?.request?.auth).toMatchObject({ type: "bearer", token: "abc123" });
    expect(basic?.request?.auth).toMatchObject({
      type: "basic",
      username: "alice",
      password: "secret",
    });
    expect(apiKey?.request?.auth).toMatchObject({
      type: "api-key",
      apiKey: "X-Api-Key",
      apiValue: "shh",
    });
  });

  it("maps a urlencoded body", () => {
    const parsed = parsePostmanCollection(
      collection([
        {
          name: "Login",
          request: {
            method: "POST",
            url: "https://api.acme.dev/login",
            body: {
              mode: "urlencoded",
              urlencoded: [
                { key: "user", value: "alice" },
                { key: "pass", value: "secret", disabled: true },
              ],
            },
          },
        },
      ]),
    );

    const node = parsed?.root[0];
    expect(node?.request?.bodyType).toBe("application/x-www-form-urlencoded");
    expect(node?.request?.formData).toEqual([
      {
        key: "user",
        value: "alice",
        enabled: true,
        isFile: false,
        file: null,
        fileName: undefined,
      },
      {
        key: "pass",
        value: "secret",
        enabled: false,
        isFile: false,
        file: null,
        fileName: undefined,
      },
    ]);
  });

  it("gives every node and its request a name, defaulting when missing", () => {
    const parsed = parsePostmanCollection(
      collection([{ request: { method: "GET", url: "https://api.acme.dev/x" } }]),
    );
    expect(parsed?.root[0]?.name).toBe("Untitled Request");
  });
});
