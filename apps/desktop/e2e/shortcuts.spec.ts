import { expect, test } from "@playwright/test";
import { clickSend, mockJson, openApp, responseStatus, typeUrl, urlInput } from "./helpers";

test.describe("keyboard shortcuts", () => {
  test("⌘N opens a new tab, ⌘W closes it", async ({ page }) => {
    await openApp(page);
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(1);

    await page.keyboard.press("ControlOrMeta+Shift+n");
    await expect(tabs).toHaveCount(2);

    await page.keyboard.press("ControlOrMeta+Shift+w");
    await expect(tabs).toHaveCount(1);
  });

  test("⌘⇧1-9 switches to the tab at that position", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/first");
    await page.keyboard.press("ControlOrMeta+Shift+n");
    await typeUrl(page, "https://api.example.com/second");

    // Currently on tab 2 (second). Switch back to tab 1.
    await page.keyboard.press("ControlOrMeta+Shift+1");
    await expect(urlInput(page)).toHaveValue("https://api.example.com/first");

    await page.keyboard.press("ControlOrMeta+Shift+2");
    await expect(urlInput(page)).toHaveValue("https://api.example.com/second");
  });

  test("⌘Enter sends the active request", async ({ page }) => {
    await openApp(page);
    await mockJson(page, "api.example.com", { ok: true });
    await typeUrl(page, "https://api.example.com/ping");

    await urlInput(page).focus();
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(responseStatus(page)).toContainText("200");
  });

  test("⌘F focuses the header search input", async ({ page }) => {
    await openApp(page);
    await page.keyboard.press("ControlOrMeta+f");
    await expect(page.locator("[data-header-search]")).toBeFocused();
  });

  test("⌘S opens Save to Collection for the active request", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/save-me");
    await page.keyboard.press("ControlOrMeta+s");
    await expect(page.getByText("Save to Collection")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Save to Collection")).not.toBeVisible();
  });

  test("⌘/ opens the shortcuts modal, listing ⌘K", async ({ page }) => {
    await openApp(page);
    await page.keyboard.press("ControlOrMeta+Shift+/");
    await expect(page.getByRole("dialog")).toContainText("Keyboard Shortcuts");
    await expect(page.getByText("Open command palette")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("⌘, opens Settings", async ({ page }) => {
    await openApp(page);
    await page.keyboard.press("ControlOrMeta+Shift+,");
    await expect(page.getByRole("dialog")).toContainText("Settings");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
