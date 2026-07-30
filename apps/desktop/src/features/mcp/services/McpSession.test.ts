import { describe, expect, it } from "vitest";
import type { McpHttpResponse, McpTransport } from "../ports/McpTransport";
import { McpConnectError, McpProtocolError, McpSession } from "./McpSession";

function fakeTransport(
  handler: (url: string, headers: Record<string, string>, body: string) => McpHttpResponse,
): McpTransport {
  return {
    post: async (url, headers, body) => handler(url, headers, body),
  };
}

describe("McpSession", () => {
  it("initializes, tracks the session id, and sends notifications/initialized", async () => {
    let seenSessionHeader: string | undefined;
    const session = new McpSession(
      fakeTransport((_url, headers, body): McpHttpResponse => {
        const msg = JSON.parse(body);
        if (msg.method === "initialize") {
          return {
            status: 200,
            headers: { "mcp-session-id": "sess-123" },
            bodyText: JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { ok: true } }),
          };
        }
        if (msg.method === "notifications/initialized") {
          seenSessionHeader = headers["mcp-session-id"];
          return { status: 202, headers: {}, bodyText: "" };
        }
        return { status: 200, headers: {}, bodyText: "{}" };
      }),
      "https://mcp.example.com",
      {},
    );

    await session.initialize();
    expect(session.sessionId).toBe("sess-123");
    expect(seenSessionHeader).toBe("sess-123");
  });

  it("lists tools and resources", async () => {
    const session = new McpSession(
      fakeTransport((_url, _headers, body) => {
        const msg = JSON.parse(body);
        if (msg.method === "tools/list") {
          return {
            status: 200,
            headers: {},
            bodyText: JSON.stringify({
              jsonrpc: "2.0",
              id: msg.id,
              result: { tools: [{ name: "echo", inputSchema: { properties: {} } }] },
            }),
          };
        }
        if (msg.method === "resources/list") {
          return {
            status: 200,
            headers: {},
            bodyText: JSON.stringify({
              jsonrpc: "2.0",
              id: msg.id,
              result: { resources: [{ uri: "file:///a.txt" }] },
            }),
          };
        }
        return { status: 200, headers: {}, bodyText: "{}" };
      }),
      "https://mcp.example.com",
      {},
    );

    expect(await session.listTools()).toEqual([{ name: "echo", inputSchema: { properties: {} } }]);
    expect(await session.listResources()).toEqual([{ uri: "file:///a.txt" }]);
  });

  it("calls a tool and returns its result", async () => {
    const session = new McpSession(
      fakeTransport((_url, _headers, body) => {
        const msg = JSON.parse(body);
        return {
          status: 200,
          headers: {},
          bodyText: JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: { content: [{ type: "text", text: `echoed:${msg.params.arguments.text}` }] },
          }),
        };
      }),
      "https://mcp.example.com",
      {},
    );

    const result = await session.callTool("echo", { text: "hi" });
    expect(result).toEqual({ content: [{ type: "text", text: "echoed:hi" }] });
  });

  it("throws McpProtocolError on a JSON-RPC error response", async () => {
    const session = new McpSession(
      fakeTransport((_url, _headers, body) => {
        const msg = JSON.parse(body);
        return {
          status: 200,
          headers: {},
          bodyText: JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            error: { code: -32601, message: "Method not found" },
          }),
        };
      }),
      "https://mcp.example.com",
      {},
    );

    await expect(session.listTools()).rejects.toThrow(McpProtocolError);
  });

  it("throws McpProtocolError on a non-2xx HTTP status", async () => {
    const session = new McpSession(
      fakeTransport(() => ({ status: 500, headers: {}, bodyText: "" })),
      "https://mcp.example.com",
      {},
    );
    await expect(session.listTools()).rejects.toThrow(McpProtocolError);
  });

  it("wraps a transport-level failure in McpConnectError", async () => {
    const session = new McpSession(
      {
        post: async () => {
          throw new Error("network down");
        },
      },
      "https://mcp.example.com",
      {},
    );
    await expect(session.listTools()).rejects.toThrow(McpConnectError);
  });
});
