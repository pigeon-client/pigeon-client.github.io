import { expect, test } from "@playwright/test";
import { clickSend, mockJson, openApp, responseBody, responseStatus, typeUrl } from "./helpers";

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
});
