import { expect, test } from "@playwright/test";
import { methodTrigger, openApp, typeUrl } from "./helpers";

test.describe("method selector & header actions", () => {
  test("changes the HTTP method via the dropdown", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/x");

    await methodTrigger(page).click();
    await page.getByTestId("method-option-DELETE").click();

    await expect(methodTrigger(page)).toContainText("DELETE");
  });

  test("copy-as-cURL confirms with a check", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/x");

    // Grant clipboard so the copy path succeeds.
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await page.locator('[aria-label="Copy as cURL"]').click();
    await expect(page.locator('[title="Copied!"]')).toBeVisible();
  });
});
