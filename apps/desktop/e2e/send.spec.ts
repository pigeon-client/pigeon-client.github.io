import { expect, test } from "@playwright/test";
import {
  clickSend,
  editorTab,
  mockJson,
  openApp,
  responseBody,
  responseStatus,
  typeUrl,
} from "./helpers";

test.describe("send request", () => {
  test("sends and renders a 200 JSON response", async ({ page }) => {
    await openApp(page);
    await mockJson(page, "api.example.com", { message: "pong", id: 42 });

    await typeUrl(page, "https://api.example.com/ping");
    await clickSend(page);

    await expect(responseStatus(page)).toContainText("200");
    await expect(responseBody(page)).toContainText("pong");
    await expect(responseBody(page)).toContainText("42");
  });

  test("surfaces a non-2xx status", async ({ page }) => {
    await openApp(page);
    await mockJson(page, "api.example.com", { error: "nope" }, 404);

    await typeUrl(page, "https://api.example.com/missing");
    await clickSend(page);

    await expect(responseStatus(page)).toContainText("404");
  });

  test("a non-2xx empty body shows the empty-body placeholder, not a blank pane", async ({
    page,
  }) => {
    await openApp(page);
    await page.route(
      (u) => u.href.includes("api.example.com"),
      (route) => route.fulfill({ status: 404, body: "" }),
    );

    await typeUrl(page, "https://api.example.com/missing");
    await clickSend(page);

    await expect(responseStatus(page)).toContainText("404");
    await expect(page.locator('[data-testid="response-empty-body"]:visible')).toBeVisible();
  });

  test("Bearer auth sets the Authorization header on the wire", async ({ page }) => {
    await openApp(page);
    let seenAuth: string | null = null;
    await page.route(
      (u) => u.href.includes("api.example.com"),
      (route) => {
        seenAuth = route.request().headers().authorization ?? null;
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      },
    );

    await typeUrl(page, "https://api.example.com/secure");
    await editorTab(page, "Auth");
    await page.getByRole("combobox").selectOption("bearer");
    await page.getByPlaceholder("eyJhbGciOiJIUzI1NiIs...").fill("my-secret-token");
    await clickSend(page);

    await expect(responseStatus(page)).toContainText("200");
    expect(seenAuth).toBe("Bearer my-secret-token");
  });
});
