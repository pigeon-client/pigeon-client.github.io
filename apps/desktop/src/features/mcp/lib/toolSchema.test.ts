import { describe, expect, it } from "vitest";
import { buildToolArgs, coerceArgValue, isSimpleSchema } from "./toolSchema";

describe("isSimpleSchema", () => {
  it("is true for scalar-only schemas", () => {
    expect(
      isSimpleSchema({
        properties: { name: { type: "string" }, count: { type: "integer" } },
      }),
    ).toBe(true);
  });

  it("is false for object/array properties (raw-JSON fallback territory)", () => {
    expect(isSimpleSchema({ properties: { payload: { type: "object" } } })).toBe(false);
  });

  it("is false with no properties at all", () => {
    expect(isSimpleSchema(undefined)).toBe(false);
    expect(isSimpleSchema({})).toBe(false);
  });
});

describe("coerceArgValue", () => {
  it("coerces number/integer/boolean, leaves string as-is", () => {
    expect(coerceArgValue({ type: "number" }, "3.5")).toBe(3.5);
    expect(coerceArgValue({ type: "integer" }, "3")).toBe(3);
    expect(coerceArgValue({ type: "boolean" }, "true")).toBe(true);
    expect(coerceArgValue({ type: "boolean" }, "false")).toBe(false);
    expect(coerceArgValue({ type: "string" }, "hi")).toBe("hi");
  });
});

describe("buildToolArgs", () => {
  it("drops empty optional fields but keeps empty required ones", () => {
    const schema = {
      properties: { name: { type: "string" }, note: { type: "string" } },
      required: ["name"],
    };
    const args = buildToolArgs(schema, { name: "", note: "" });
    expect(args).toEqual({ name: "" });
  });

  it("coerces typed fields", () => {
    const schema = { properties: { count: { type: "integer" } } };
    const args = buildToolArgs(schema, { count: "42" });
    expect(args).toEqual({ count: 42 });
  });
});
