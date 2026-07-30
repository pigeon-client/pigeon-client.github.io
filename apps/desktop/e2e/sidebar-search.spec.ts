import { expect, test } from "@playwright/test";
import { mockJson, openApp, sidebarTab, typeUrl } from "./helpers";

test.describe("sidebar search", () => {
  test("⌘F filters History and Drafts by name/URL", async ({ page }) => {
    await openApp(page);
    await mockJson(page, "api.example.com", { ok: true });
    const sidebar = page.getByRole("complementary");

    await typeUrl(page, "https://api.example.com/alpha");
    await page.locator("[data-send-btn]:visible").click();
    await expect(page.locator('[data-testid="response-status"]:visible')).toContainText("200");
    await page.keyboard.press("ControlOrMeta+Shift+n");
    await typeUrl(page, "https://api.example.com/beta");
    await page.locator("[data-send-btn]:visible").click();
    await expect(page.locator('[data-testid="response-status"]:visible')).toContainText("200");

    await sidebarTab(page, "History");
    await expect(sidebar.getByText("alpha").first()).toBeVisible();
    await expect(sidebar.getByText("beta").first()).toBeVisible();

    await page.keyboard.press("ControlOrMeta+f");
    await page.keyboard.type("beta");

    await expect(sidebar.getByText("beta").first()).toBeVisible();
    await expect(sidebar.getByText("No matching history")).not.toBeVisible();
    await expect(sidebar.getByText("alpha")).not.toBeVisible();

    await sidebarTab(page, "Draft");
    // Both drafts share a host, so they're collapsed under one folder row —
    // expand it, then confirm the filter narrowed its leaves to just "beta".
    await sidebar.getByText("api.example.com", { exact: true }).click();
    await expect(sidebar.getByText("beta").first()).toBeVisible();
    await expect(sidebar.getByText("alpha")).not.toBeVisible();
  });
});
