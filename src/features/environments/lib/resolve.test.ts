import { describe, expect, it } from "vitest";
import { replaceEnvVariables } from "./resolve";

const env = (variables: Record<string, string>) => ({ name: "e", variables });

describe("replaceEnvVariables", () => {
  it("substitutes {{var}} tokens", () => {
    expect(replaceEnvVariables("{{base}}/users", env({ base: "https://api.x" }))).toBe(
      "https://api.x/users",
    );
  });

  it("replaces repeated tokens", () => {
    expect(replaceEnvVariables("{{a}}-{{a}}", env({ a: "1" }))).toBe("1-1");
  });

  it("leaves unknown tokens intact", () => {
    expect(replaceEnvVariables("{{known}} {{missing}}", env({ known: "ok" }))).toBe(
      "ok {{missing}}",
    );
  });

  it("passes the string through when env is null", () => {
    expect(replaceEnvVariables("{{a}}", null)).toBe("{{a}}");
  });

  it("trims whitespace inside the braces", () => {
    expect(replaceEnvVariables("{{ a }}", env({ a: "v" }))).toBe("v");
  });
});
