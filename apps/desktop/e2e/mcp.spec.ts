import { expect, test } from "@playwright/test";
import { openApp } from "./helpers";

/** MCP is an in-place coming-soon page (no new tab, no sidebar). */
test.describe("MCP workspace (coming soon)", () => {
  test("header swaps to the MCP coming-soon page without a new tab", async ({ page }) => {
    await openApp(page);
    const tabCountBefore = await page.getByRole("tab").count();
    await page.getByTestId("header-open-mcp").click();
    await expect(page.getByTestId("mcp-coming-soon")).toBeVisible();
    await expect(page.getByTestId("mcp-coming-soon")).toContainText("coming soon");
    await expect(page.locator('[data-testid="url-input"]:visible')).toHaveCount(0);
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByTestId("sidebar-collapse")).toHaveCount(0);
    await page.getByTestId("header-open-rest").click();
    await expect(page.getByRole("tab")).toHaveCount(tabCountBefore);
  });
});
