import { describe, expect, it } from "vitest";
import type { AuthConfig, RequestConfig } from "@/shared/types";
import type { CollectionNode } from "../types";
import { resolveInheritedRequest } from "./inheritance";

const AUTH_NONE: AuthConfig = {
  type: "none",
  username: "",
  password: "",
  token: "",
  apiKey: "",
  apiValue: "",
  apiAddTo: "header",
};

const bearer = (token: string): AuthConfig => ({ ...AUTH_NONE, type: "bearer", token });

function makeRequest(overrides: Partial<RequestConfig> = {}): RequestConfig {
  return {
    name: "req",
    method: "GET",
    url: "https://api.example.com",
    params: [],
    headers: [],
    bodyType: "none",
    body: "",
    formData: [],
    multipart: [],
    file: null,
    auth: AUTH_NONE,
    ...overrides,
  };
}

function folder(name: string, config: CollectionNode["folderConfig"]): CollectionNode {
  return { id: name, type: "folder", name, children: [], folderConfig: config };
}

describe("resolveInheritedRequest", () => {
  it("returns the request unchanged when there's nothing to inherit", () => {
    const req = makeRequest();
    expect(resolveInheritedRequest([], req)).toBe(req);
  });

  it("adds folder headers not present on the request", () => {
    const req = makeRequest();
    const ancestors = [
      folder("root", { headers: [{ key: "X-Env", value: "prod", enabled: true }] }),
    ];
    const resolved = resolveInheritedRequest(ancestors, req);
    expect(resolved.headers).toEqual([
      { key: "X-Env", value: "prod", enabled: true, inherited: true },
    ]);
  });

  it("request's own header wins over a folder header with the same key", () => {
    const req = makeRequest({ headers: [{ key: "X-Env", value: "own", enabled: true }] });
    const ancestors = [
      folder("root", { headers: [{ key: "x-env", value: "prod", enabled: true }] }),
    ];
    const resolved = resolveInheritedRequest(ancestors, req);
    expect(resolved.headers).toEqual([{ key: "X-Env", value: "own", enabled: true }]);
  });

  it("closer folder wins over a farther one for the same header key", () => {
    const req = makeRequest();
    const ancestors = [
      folder("root", { headers: [{ key: "X-Env", value: "outer", enabled: true }] }),
      folder("inner", { headers: [{ key: "X-Env", value: "inner", enabled: true }] }),
    ];
    const resolved = resolveInheritedRequest(ancestors, req);
    expect(resolved.headers).toEqual([
      { key: "X-Env", value: "inner", enabled: true, inherited: true },
    ]);
  });

  it("skips disabled folder headers", () => {
    const req = makeRequest();
    const ancestors = [folder("root", { headers: [{ key: "X-Env", value: "x", enabled: false }] })];
    expect(resolveInheritedRequest(ancestors, req).headers).toEqual([]);
  });

  it("request's own auth wins over folder auth", () => {
    const req = makeRequest({ auth: bearer("own-token") });
    const ancestors = [folder("root", { auth: bearer("folder-token") })];
    expect(resolveInheritedRequest(ancestors, req).auth).toEqual(bearer("own-token"));
  });

  it("inherits the nearest ancestor's auth when the request has none", () => {
    const req = makeRequest();
    const ancestors = [
      folder("root", { auth: bearer("outer-token") }),
      folder("inner", { auth: bearer("inner-token") }),
    ];
    expect(resolveInheritedRequest(ancestors, req).auth).toEqual({
      ...bearer("inner-token"),
      inherited: true,
    });
  });

  it("falls through to a farther ancestor's auth when the nearer one is unset", () => {
    const req = makeRequest();
    const ancestors = [folder("root", { auth: bearer("outer-token") }), folder("inner", {})];
    expect(resolveInheritedRequest(ancestors, req).auth).toEqual({
      ...bearer("outer-token"),
      inherited: true,
    });
  });

  it("inherits collection-level headers when no folder overrides exist", () => {
    const req = makeRequest();
    const collectionConfig = {
      headers: [{ key: "X-Collection", value: "all", enabled: true }],
    };
    const resolved = resolveInheritedRequest([], req, collectionConfig);
    expect(resolved.headers).toEqual([
      { key: "X-Collection", value: "all", enabled: true, inherited: true },
    ]);
  });

  it("folder header wins over collection header with the same key", () => {
    const req = makeRequest();
    const ancestors = [
      folder("root", { headers: [{ key: "X-Env", value: "folder", enabled: true }] }),
    ];
    const collectionConfig = {
      headers: [{ key: "X-Env", value: "collection", enabled: true }],
    };
    const resolved = resolveInheritedRequest(ancestors, req, collectionConfig);
    expect(resolved.headers).toEqual([
      { key: "X-Env", value: "folder", enabled: true, inherited: true },
    ]);
  });

  it("inherits collection auth when request and folders have none", () => {
    const req = makeRequest();
    const collectionConfig = { auth: bearer("collection-token") };
    expect(resolveInheritedRequest([], req, collectionConfig).auth).toEqual({
      ...bearer("collection-token"),
      inherited: true,
    });
  });

  it("nearest folder auth wins over collection auth", () => {
    const req = makeRequest();
    const ancestors = [folder("root", { auth: bearer("folder-token") })];
    const collectionConfig = { auth: bearer("collection-token") };
    expect(resolveInheritedRequest(ancestors, req, collectionConfig).auth).toEqual({
      ...bearer("folder-token"),
      inherited: true,
    });
  });
});
