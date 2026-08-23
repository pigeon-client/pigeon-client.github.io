import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64, decodeIpcBody, EMPTY_BODY, utf8Bytes } from "./bytes";

describe("bytesToBase64 / base64ToBytes", () => {
  it("round-trips empty and binary payloads", () => {
    expect(base64ToBytes(bytesToBase64(EMPTY_BODY))).toEqual(EMPTY_BODY);
    const bytes = Uint8Array.from([0, 1, 255, 10, 13]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });

  it("round-trips utf-8 text", () => {
    const bytes = utf8Bytes('{"ok":true}');
    expect(new TextDecoder().decode(base64ToBytes(bytesToBase64(bytes)))).toBe('{"ok":true}');
  });
});

describe("decodeIpcBody", () => {
  it("accepts base64 strings, number arrays, and Uint8Array", () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    expect(decodeIpcBody(bytesToBase64(bytes))).toEqual(bytes);
    expect(decodeIpcBody([1, 2, 3])).toEqual(bytes);
    expect(decodeIpcBody(bytes)).toBe(bytes);
    expect(decodeIpcBody(null)).toBe(EMPTY_BODY);
  });
});
