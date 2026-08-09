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
    const tabs = page.getByRole("tablist", { name: "Workspace tabs" }).getByRole("tab");
    await expect(tabs).toHaveCount(1);

    await page.locator('[title="New request"]').click();
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toBeFocused();

    // Close the active tab via its X.
    await tabs.nth(1).getByRole("button", { name: "Close tab" }).click();
    await expect(tabs).toHaveCount(1);
  });

  test("supports Postman-style tab shortcuts", async ({ page }) => {
    await openApp(page);
    const tabs = page.getByRole("tablist", { name: "Workspace tabs" }).getByRole("tab");

    await page.keyboard.press("Control+T");
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Control+1");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Control+W");
    await expect(tabs).toHaveCount(1);
  });

  test("restores open tabs after app reload", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/first");
    await page.locator('[title="New request"]').click();
    await typeUrl(page, "https://api.example.com/second");

    await page.reload();

    const tabs = page.getByRole("tablist", { name: "Workspace tabs" }).getByRole("tab");
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toContainText("/first");
    await expect(tabs.nth(1)).toContainText("/second");
    await expect(urlInput(page)).toHaveValue("https://api.example.com/second");
  });

  test("reorders tabs by drag and drop", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/first");
    await page.locator('[title="New request"]').click();
    await typeUrl(page, "https://api.example.com/second");
    await page.locator('[title="New request"]').click();
    await typeUrl(page, "https://api.example.com/third");

    const tabs = page.getByRole("tablist", { name: "Workspace tabs" }).getByRole("tab");
    const source = await tabs.nth(2).boundingBox();
    const target = await tabs.nth(0).boundingBox();
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();
    await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
    await page.mouse.down();
    await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, {
      steps: 8,
    });
    await page.mouse.up();

    await expect(tabs.nth(0)).toContainText("/third");
    await expect(tabs.nth(1)).toContainText("/first");
    await expect(tabs.nth(2)).toContainText("/second");
  });

  test("scrolls overflowing tabs with navigation buttons", async ({ page }) => {
    await openApp(page);
    const newTabButton = page.locator('[title="New request"]');
    for (let i = 0; i < 12; i++) await newTabButton.click();

    const tablist = page.getByRole("tablist", { name: "Workspace tabs" });
    const scrollRight = page.getByRole("button", { name: "Scroll tabs right" });
    const scrollLeft = page.getByRole("button", { name: "Scroll tabs left" });
    await tablist.hover();
    await expect(scrollRight).toBeVisible();
    await expect(scrollLeft).toBeVisible();

    await scrollLeft.click();
    await expect
      .poll(() => tablist.evaluate((element) => element.scrollLeft))
      .toBe(0);
    await expect(scrollLeft).toHaveAttribute("aria-disabled", "true");

    await scrollRight.click();
    await expect
      .poll(() => tablist.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);

    await scrollLeft.click();
    await expect
      .poll(() => tablist.evaluate((element) => element.scrollLeft))
      .toBe(0);
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
