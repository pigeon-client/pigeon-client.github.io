import { expect, test } from "@playwright/test";
import { openApp } from "./helpers";

/** Stub a minimal MCP Streamable-HTTP server: initialize, notifications/initialized,
 *  tools/list, resources/list, tools/call — enough for the bench's happy path. */
async function stubMcpServer(page: import("@playwright/test").Page, url: string) {
  await page.route(
    (u) => u.href === url,
    async (route) => {
      const req = route.request();
      const body = JSON.parse(req.postData() ?? "{}");

      if (body.method === "notifications/initialized") {
        await route.fulfill({ status: 202, body: "" });
        return;
      }

      if (body.method === "initialize") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Mcp-Session-Id": "sess-e2e-1" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: { protocolVersion: "2025-03-26", capabilities: {}, serverInfo: { name: "stub" } },
          }),
        });
        return;
      }

      if (body.method === "tools/list") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              tools: [
                {
                  name: "echo",
                  description: "Echoes the given text back",
                  inputSchema: {
                    type: "object",
                    properties: { text: { type: "string", description: "Text to echo" } },
                    required: ["text"],
                  },
                },
              ],
            },
          }),
        });
        return;
      }

      if (body.method === "resources/list") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { resources: [] } }),
        });
        return;
      }

      if (body.method === "tools/call") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: { content: [{ type: "text", text: `echo: ${body.params.arguments.text}` }] },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: {} }),
      });
    },
  );
}

test.describe("MCP bench", () => {
  test("connects, lists tools, calls one, and renders the result", async ({ page }) => {
    await openApp(page);
    const url = "https://mcp.example.com/mcp";
    await stubMcpServer(page, url);

    await page.getByTestId("header-open-mcp").click();
    await page.getByTestId("mcp-connect-url").fill(url);
    await page.getByTestId("mcp-connect-btn").click();

    await expect(page.getByTestId("mcp-tool-echo")).toBeVisible();
    await page.getByTestId("mcp-tool-echo").click();

    await page.getByTestId("mcp-arg-text").fill("hello");
    await page.getByTestId("mcp-call-btn").click();

    await expect(page.getByTestId("mcp-result")).toBeVisible();
    await expect(page.getByTestId("mcp-result")).toContainText("echo: hello");
  });

  test("a bad URL surfaces an in-pane error, not a crash", async ({ page }) => {
    await openApp(page);
    await page.route(
      (u) => u.href === "https://unreachable.invalid/mcp",
      (route) => route.abort("failed"),
    );

    await page.getByTestId("header-open-mcp").click();
    await page.getByTestId("mcp-connect-url").fill("https://unreachable.invalid/mcp");
    await page.getByTestId("mcp-connect-btn").click();

    await expect(page.getByTestId("mcp-error")).toBeVisible();
    // The rest of the app is still alive underneath.
    await expect(page.getByTestId("mcp-connect-url")).toBeVisible();
  });
});
