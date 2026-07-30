import { expect, test } from "@playwright/test";
import { openApp, typeUrl, urlInput } from "./helpers";

test.describe("tabs", () => {
  test("auto name follows the URL path", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/widgets");
    await expect(page.getByRole("tab").filter({ hasText: "/widgets" })).toBeVisible();

    await typeUrl(page, "https://api.example.com/gadgets");
    await expect(page.getByRole("tab").filter({ hasText: "/gadgets" })).toBeVisible();
  });

  test("opens and closes tabs", async ({ page }) => {
    await openApp(page);
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(1);

    await page.locator('[title="New request"]').click();
    await expect(tabs).toHaveCount(2);

    // Close the active tab via its X.
    await tabs.nth(1).getByRole("button", { name: "Close tab" }).click();
    await expect(tabs).toHaveCount(1);
  });

  test("a manual rename sticks across a path change", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/first");
    const tab = page.getByRole("tab").first();
    await expect(tab).toContainText("/first");

    await tab.getByText("/first").dblclick();
    const renameInput = tab.locator("input");
    await renameInput.fill("My Tab");
    await renameInput.press("Enter");
    await expect(tab).toContainText("My Tab");

    // Path change must not touch the manual name.
    await typeUrl(page, "https://api.example.com/second");
    await expect(tab).toContainText("My Tab");
  });

  test("Escape closes the tab context menu and restores app input", async ({ page }) => {
    await openApp(page);
    await page.getByRole("tab").first().click({ button: "right" });
    await expect(page.getByRole("menu")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();

    await urlInput(page).click();
    await urlInput(page).fill("https://api.example.com/after-menu");
    await expect(urlInput(page)).toHaveValue("https://api.example.com/after-menu");
  });
});
