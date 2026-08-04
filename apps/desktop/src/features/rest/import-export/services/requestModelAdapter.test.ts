import { describe, expect, it } from "vitest";
import { toMethod, VALID_METHODS } from "./requestModelAdapter";

describe("toMethod", () => {
  it("accepts QUERY", () => {
    expect(toMethod("QUERY")).toBe("QUERY");
    expect(toMethod("query")).toBe("QUERY");
    expect(VALID_METHODS.has("QUERY")).toBe(true);
  });

  it("does not invent TRACE or CONNECT support", () => {
    expect(VALID_METHODS.has("TRACE")).toBe(false);
    expect(VALID_METHODS.has("CONNECT")).toBe(false);
    // Unsupported tokens fall back to GET rather than being selectable.
    expect(toMethod("TRACE")).toBe("GET");
    expect(toMethod("CONNECT")).toBe("GET");
  });
});
