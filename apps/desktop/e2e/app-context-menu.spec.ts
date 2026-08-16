import { expect, test } from "@playwright/test";
import { openApp, urlInput } from "./helpers";

test.describe("app context menu", () => {
  test("right-click on chrome opens the fallback menu, not the webview menu", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("sidebar-tab-history").click({ button: "right" });

    const menu = page.getByTestId("app-context-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /Copy/ })).toBeVisible();
    await expect(page.getByText("Inspect Element")).toHaveCount(0);
    await expect(page.getByText('Look Up "History"')).toHaveCount(0);
  });

  test("right-click on a workspace tab still opens the tab menu", async ({ page }) => {
    await openApp(page);
    await page.getByRole("tab").first().click({ button: "right" });

    await expect(page.getByTestId("tab-context-menu")).toBeVisible();
    await expect(page.getByTestId("app-context-menu")).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: /Close Tab/ })).toBeVisible();
  });

  test("Escape dismisses the fallback menu", async ({ page }) => {
    await openApp(page);
    await page.locator('[data-testid="sidebar-tab-draft"]').click({ button: "right" });
    await expect(page.getByTestId("app-context-menu")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("app-context-menu")).toBeHidden();

    await urlInput(page).click();
    await expect(urlInput(page)).toBeFocused();
  });
});
