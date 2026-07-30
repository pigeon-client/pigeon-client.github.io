export interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: number;
  result: unknown;
}

export interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: number;
  error: { code: number; message: string; data?: unknown };
}

export type JsonRpcMessage = JsonRpcSuccess | JsonRpcFailure;

export function buildRequest(id: number, method: string, params?: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", id, method, params });
}

export function buildNotification(method: string, params?: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", method, params });
}

/**
 * Parse one JSON-RPC message out of an HTTP body that's either a bare JSON
 * object (the common non-streaming Streamable-HTTP response) or a
 * `text/event-stream` framing (`data: {...}` lines) — takes the last
 * parseable `data:` line, which is the final message for a single-call POST.
 */
export function parseJsonRpcMessage(bodyText: string): JsonRpcMessage | null {
  const trimmed = bodyText.trim();
  if (!trimmed) return null;

  const direct = tryParse(trimmed);
  if (direct) return direct;

  const dataLines = trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim());
  for (let i = dataLines.length - 1; i >= 0; i--) {
    const parsed = tryParse(dataLines[i]);
    if (parsed) return parsed;
  }
  return null;
}

function tryParse(text: string): JsonRpcMessage | null {
  try {
    const value = JSON.parse(text);
    if (value && typeof value === "object" && "jsonrpc" in value) return value as JsonRpcMessage;
    return null;
  } catch {
    return null;
  }
}

export function isJsonRpcError(message: JsonRpcMessage): message is JsonRpcFailure {
  return "error" in message;
}
