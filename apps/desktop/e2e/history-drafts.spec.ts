import { expect, test } from "@playwright/test";
import {
  clickSend,
  mockJson,
  openApp,
  responseBody,
  responseStatus,
  sidebarTab,
  typeUrl,
} from "./helpers";

test.describe("history & drafts", () => {
  test("a sent request shows up in Draft and History", async ({ page }) => {
    await openApp(page);
    await mockJson(page, "api.example.com", { ok: true });

    await typeUrl(page, "https://api.example.com/orders");
    await clickSend(page);
    await expect(responseStatus(page)).toContainText("200");

    // Draft tab (flat list for few items) shows the endpoint.
    await sidebarTab(page, "Draft");
    await expect(page.getByText("/orders").first()).toBeVisible();

    // History tab shows an entry too.
    await sidebarTab(page, "History");
    await expect(page.getByText("orders").first()).toBeVisible();
  });

  test("clicking a history row renders its response snapshot without re-sending", async ({
    page,
  }) => {
    await openApp(page);
    let sendCount = 0;
    await page.route(
      (u) => u.href.includes("api.example.com"),
      (route) => {
        sendCount++;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: '{"marker":"zzz-snapshot-body"}',
        });
      },
    );

    await typeUrl(page, "https://api.example.com/orders");
    await clickSend(page);
    await expect(responseStatus(page)).toContainText("200");
    expect(sendCount).toBe(1);

    // Open a fresh tab so the history row has to populate a response from scratch.
    await page.keyboard.press("ControlOrMeta+Shift+n");
    await sidebarTab(page, "History");
    await page.getByText("orders").first().click();

    await expect(page.getByTestId("response-snapshot-label")).toBeVisible();
    await expect(page.getByTestId("response-snapshot-label")).toContainText("snapshot");
    await expect(responseBody(page)).toContainText("zzz-snapshot-body");

    // No additional network call happened to render the snapshot.
    expect(sendCount).toBe(1);
  });
});
