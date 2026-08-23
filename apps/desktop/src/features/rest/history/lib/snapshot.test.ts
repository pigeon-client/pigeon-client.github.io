import { describe, expect, it } from "vitest";
import { buildSnapshot, SNAPSHOT_CAP_BYTES } from "./snapshot";

function bytesOf(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe("buildSnapshot", () => {
  it("captures a small text body untruncated", () => {
    const body = bytesOf('{"ok":true}');
    const snap = buildSnapshot({
      status: 200,
      statusText: "OK",
      contentType: "application/json",
      size: body.length,
      body,
    });
    expect(snap).toEqual({
      status: 200,
      statusText: "OK",
      contentType: "application/json",
      size: body.length,
      bodyText: '{"ok":true}',
      truncated: false,
    });
  });

  it("stores metadata only for binary/media content types", () => {
    const body = Uint8Array.from([1, 2, 3, 4]);
    const snap = buildSnapshot({
      status: 200,
      statusText: "OK",
      contentType: "image/png",
      size: body.length,
      body,
    });
    expect(snap.bodyText).toBeUndefined();
    expect(snap.truncated).toBe(false);
    expect(snap.size).toBe(4);
  });

  it("truncates a text body over the 256KB cap and sets the flag", () => {
    const big = "x".repeat(SNAPSHOT_CAP_BYTES + 1000);
    const body = bytesOf(big);
    const snap = buildSnapshot({
      status: 200,
      statusText: "OK",
      contentType: "text/plain",
      size: body.length,
      body,
    });
    expect(snap.truncated).toBe(true);
    expect(snap.bodyText?.length).toBeLessThanOrEqual(SNAPSHOT_CAP_BYTES);
    expect(snap.size).toBe(body.length); // original size preserved even though bodyText is cut
  });
});
