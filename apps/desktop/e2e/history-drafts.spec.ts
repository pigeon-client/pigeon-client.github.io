import { expect, test } from "@playwright/test";
import { clickSend, mockJson, openApp, responseStatus, sidebarTab, typeUrl } from "./helpers";

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
});
