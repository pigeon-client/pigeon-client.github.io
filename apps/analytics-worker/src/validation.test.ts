import { beforeEach, describe, expect, it } from "vitest";
import { allowRequest, resetRateLimitState } from "./rateLimit";
import { validateEventPayload } from "./validation";

const valid = {
  install_id: "550e8400-e29b-41d4-a716-446655440000",
  event: "install",
  version: "1.0.0",
  platform: "macos",
  arch: "aarch64",
};

describe("validateEventPayload", () => {
  it("accepts a valid install payload", () => {
    const result = validateEventPayload(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.install_id).toBe(valid.install_id.toLowerCase());
      expect(result.data.event).toBe("install");
    }
  });

  it("accepts launch", () => {
    const result = validateEventPayload({ ...valid, event: "launch" });
    expect(result.ok).toBe(true);
  });

  it("rejects invalid UUID with a clear error", () => {
    const result = validateEventPayload({ ...valid, install_id: "not-a-uuid" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/UUID/i);
  });

  it("rejects unsupported events", () => {
    const result = validateEventPayload({ ...valid, event: "pageview" });
    expect(result.ok).toBe(false);
  });

  it("rejects bad platform", () => {
    const result = validateEventPayload({ ...valid, platform: "android" });
    expect(result.ok).toBe(false);
  });

  it("rejects bad arch", () => {
    const result = validateEventPayload({ ...valid, arch: "potato" });
    expect(result.ok).toBe(false);
  });

  it("rejects unexpected fields (PII guard)", () => {
    const result = validateEventPayload({ ...valid, email: "a@b.c" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Unexpected field/);
  });

  it("rejects empty / oversized version", () => {
    expect(validateEventPayload({ ...valid, version: "" }).ok).toBe(false);
    expect(validateEventPayload({ ...valid, version: "x".repeat(100) }).ok).toBe(false);
  });
});

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it("allows a burst then blocks", () => {
    const key = "id:test";
    for (let i = 0; i < 30; i++) {
      expect(allowRequest(key)).toBe(true);
    }
    expect(allowRequest(key)).toBe(false);
  });
});
