import { describe, expect, it } from "vitest";
import { HTTP_METHODS, isHttpMethod, methodAllowsRequestBody, methodTextClass } from "./httpMethod";

describe("httpMethod", () => {
  it("lists QUERY among supported methods", () => {
    expect(HTTP_METHODS).toContain("QUERY");
    expect(isHttpMethod("QUERY")).toBe(true);
    expect(isHttpMethod("query")).toBe(true);
    expect(isHttpMethod("TRACE")).toBe(false);
    expect(isHttpMethod("CONNECT")).toBe(false);
  });

  it("forbids request bodies on GET and HEAD (RFC 9110)", () => {
    expect(methodAllowsRequestBody("GET")).toBe(false);
    expect(methodAllowsRequestBody("HEAD")).toBe(false);
    expect(methodAllowsRequestBody("POST")).toBe(true);
    expect(methodAllowsRequestBody("QUERY")).toBe(true);
    expect(methodAllowsRequestBody("DELETE")).toBe(true);
  });

  it("maps QUERY to its accent class", () => {
    expect(methodTextClass("QUERY")).toBe("text-method-query");
  });
});
