import { describe, expect, it } from "vitest";
import { buildNotification, buildRequest, isJsonRpcError, parseJsonRpcMessage } from "./jsonRpc";

describe("buildRequest / buildNotification", () => {
  it("builds a request with an id", () => {
    const raw = buildRequest(1, "tools/list", { foo: "bar" });
    expect(JSON.parse(raw)).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: { foo: "bar" },
    });
  });

  it("builds a notification with no id", () => {
    const raw = buildNotification("notifications/initialized");
    const parsed = JSON.parse(raw);
    expect(parsed.id).toBeUndefined();
    expect(parsed.method).toBe("notifications/initialized");
  });
});

describe("parseJsonRpcMessage", () => {
  it("parses a bare JSON success response", () => {
    const msg = parseJsonRpcMessage('{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}');
    expect(msg).toEqual({ jsonrpc: "2.0", id: 1, result: { tools: [] } });
  });

  it("parses a bare JSON error response", () => {
    const msg = parseJsonRpcMessage(
      '{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"nope"}}',
    );
    expect(msg && isJsonRpcError(msg)).toBe(true);
  });

  it("parses the last data: line of an SSE-framed body", () => {
    const body = [
      "event: message",
      'data: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}',
      "",
      "event: message",
      'data: {"jsonrpc":"2.0","id":2,"result":{"final":true}}',
    ].join("\n");
    const msg = parseJsonRpcMessage(body);
    expect(msg?.id).toBe(2);
  });

  it("returns null for empty or garbage input", () => {
    expect(parseJsonRpcMessage("")).toBeNull();
    expect(parseJsonRpcMessage("not json at all")).toBeNull();
  });
});
