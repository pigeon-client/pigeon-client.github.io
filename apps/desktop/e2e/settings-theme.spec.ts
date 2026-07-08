import { expect, test } from "@playwright/test";
import { openApp } from "./helpers";

test.describe("settings & theme", () => {
  test("switches theme between dark and light", async ({ page }) => {
    await openApp(page);
    await page.locator('[title="Settings (⌘,)"]').click();

    // Light theme is the CSS default → applyTheme removes the `dark` class.
    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("navigates settings tabs", async ({ page }) => {
    await openApp(page);
    await page.locator('[title="Settings (⌘,)"]').click();

    await page.getByRole("button", { name: "Requests" }).click();
    await expect(page.getByText("Follow Redirects")).toBeVisible();

    await page.getByRole("button", { name: "About" }).click();
    await expect(page.getByText("Version")).toBeVisible();
  });
});
