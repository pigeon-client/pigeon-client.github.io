import { expect, test } from "@playwright/test";
import { openApp, urlInput } from "./helpers";

test.describe("environments", () => {
  test("opens the environment manager and adds an environment", async ({ page }) => {
    await openApp(page);

    // Ensure the window has focus before the global shortcut fires.
    await urlInput(page).click();
    await expect(async () => {
      await page.keyboard.press("ControlOrMeta+Shift+E");
      await expect(page.getByText("Environment Manager")).toBeVisible({ timeout: 1000 });
    }).toPass();

    await page.getByPlaceholder("Environment name…").fill("Staging");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // "Staging" shows both in the list and the modal header — assert at least one.
    await expect(page.getByText("Staging").first()).toBeVisible();
  });
});
