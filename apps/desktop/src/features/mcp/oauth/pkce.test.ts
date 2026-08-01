import { describe, expect, it } from "vitest";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "./pkce";

describe("pkce", () => {
  it("matches the RFC 7636 Appendix B test vector", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("generates a verifier with only unreserved base64url characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("generates distinct verifiers and states each call", () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
    expect(generateState()).not.toBe(generateState());
  });
});
