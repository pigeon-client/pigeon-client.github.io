import type { ApiResponse } from "../types";

/** Shared empty body — never mutate. */
export const EMPTY_BODY = new Uint8Array(0);

const B64_CHUNK = 0x8000;
const textDecoder = new TextDecoder();

/** Decode UTF-8 bytes. Reuses a module-level TextDecoder. */
export function utf8Text(bytes: Uint8Array): string {
  return bytes.length === 0 ? "" : textDecoder.decode(bytes);
}

/** Encode bytes as standard base64 (binary upload / multipart IPC). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += B64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + B64_CHUNK));
  }
  return btoa(binary);
}

/** Decode standard base64 into a `Uint8Array`. */
export function base64ToBytes(b64: string): Uint8Array {
  if (!b64) return EMPTY_BODY;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Decode a response body from IPC. Rust sends base64; older paths and tests
 * may still pass a number array or a `Uint8Array`.
 */
export function decodeIpcBody(body: unknown): Uint8Array {
  if (body instanceof Uint8Array) return body;
  if (typeof body === "string") return base64ToBytes(body);
  if (Array.isArray(body)) return Uint8Array.from(body as number[]);
  return EMPTY_BODY;
}

/** Wire shape of `ApiResponse` as returned by `invoke` (body is base64). */
export type IpcApiResponse = Omit<ApiResponse, "body"> & { body: unknown };

export function decodeIpcResponse(raw: IpcApiResponse): ApiResponse {
  return { ...raw, body: decodeIpcBody(raw.body) };
}

export function utf8Bytes(text: string): Uint8Array {
  return text ? new TextEncoder().encode(text) : EMPTY_BODY;
}
