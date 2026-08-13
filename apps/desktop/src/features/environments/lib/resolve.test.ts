import { beforeEach, describe, expect, it } from "vitest";
import { clearRandomPreviewCache, resolveTemplate } from "@/shared/lib/template";
import type { Environment, EnvVariable } from "../types";
import { makeResolver, resolveForPreview } from "./resolve";

const v = (key: string, value: string, over: Partial<EnvVariable> = {}): EnvVariable => ({
  key,
  value,
  enabled: true,
  secret: false,
  ...over,
});

const env = (variables: EnvVariable[], over: Partial<Environment> = {}): Environment => ({
  id: "e1",
  name: "Dev",
  isProduction: false,
  variables,
  ...over,
});

describe("makeResolver — precedence (R7)", () => {
  it("active environment wins over globals", () => {
    const r = makeResolver(env([v("base", "active")]), [v("base", "global")]);
    expect(r("base")).toBe("active");
  });

  it("falls back to globals when not in active env", () => {
    const r = makeResolver(env([v("a", "1")]), [v("b", "2")]);
    expect(r("b")).toBe("2");
  });

  it("ignores disabled variables", () => {
    const r = makeResolver(env([v("x", "on"), v("y", "off", { enabled: false })]), []);
    expect(r("x")).toBe("on");
    expect(r("y")).toBeUndefined();
  });

  it("first occurrence of a duplicate key wins", () => {
    const r = makeResolver(env([v("k", "first"), v("k", "second")]), []);
    expect(r("k")).toBe("first");
  });

  it("returns undefined for an unknown name", () => {
    expect(makeResolver(null, [])("nope")).toBeUndefined();
  });
});

describe("resolveTemplate — strict resolution (R3b) + built-ins (R8)", () => {
  it("reports missing variables and leaves them intact", () => {
    const { result, missing } = resolveTemplate("{{a}}/{{b}}", (n) =>
      n === "a" ? "1" : undefined,
    );
    expect(result).toBe("1/{{b}}");
    expect(missing).toEqual(["b"]);
  });

  it("collects multiple missing vars uniquely", () => {
    const { missing } = resolveTemplate("{{x}}{{y}}{{x}}", () => undefined);
    expect(missing.sort()).toEqual(["x", "y"]);
  });

  it("resolves $-built-ins even with an empty lookup", () => {
    const { result, missing } = resolveTemplate("{{$uuid}}", () => undefined);
    expect(missing).toEqual([]);
    expect(result).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("$uuid differs across calls", () => {
    const a = resolveTemplate("{{$uuid}}", () => undefined).result;
    const b = resolveTemplate("{{$uuid}}", () => undefined).result;
    expect(a).not.toBe(b);
  });

  it("$email looks like an email", () => {
    expect(resolveTemplate("{{$email}}", () => undefined).result).toMatch(/^.+@example\.com$/);
  });
});

describe("resolveForPreview", () => {
  beforeEach(() => clearRandomPreviewCache());

  it("substitutes known tokens, leaves unknown intact", () => {
    expect(resolveForPreview("{{base}}/x/{{missing}}", env([v("base", "http://api")]), [])).toBe(
      "http://api/x/{{missing}}",
    );
  });

  it("keeps $ built-ins stable across preview calls", () => {
    const a = resolveForPreview("{{$uuid}}", null, []);
    const b = resolveForPreview("{{$uuid}}", null, []);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
