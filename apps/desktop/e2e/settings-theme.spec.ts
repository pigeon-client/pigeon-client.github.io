import { expect, test } from "@playwright/test";
import { clickSend, mockJson, openApp, sidebarTab, typeUrl } from "./helpers";

test.describe("settings & theme", () => {
  test("switches theme between dark and light", async ({ page }) => {
    await openApp(page);
    await page.locator('[aria-label="Settings"]').click();

    // Light theme is the CSS default → applyTheme removes the `dark` class.
    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("navigates settings tabs", async ({ page }) => {
    await openApp(page);
    await page.locator('[aria-label="Settings"]').click();

    await page.getByRole("button", { name: "Requests" }).click();
    await expect(page.getByText("Follow Redirects")).toBeVisible();

    await page.getByRole("button", { name: "About" }).click();
    await expect(page.getByText("Version")).toBeVisible();
    await expect(page.getByText("Show first-request guide")).toHaveCount(0);
  });

  test("Clear All wipes history/drafts/environments but never collections", async ({ page }) => {
    await openApp(page);

    // Seed history + a draft (send upserts both).
    await mockJson(page, "api.example.com", { ok: true });
    await typeUrl(page, "https://api.example.com/orders");
    await clickSend(page);

    // Seed a collection.
    await sidebarTab(page, "Collections");
    const emptyCta = page.getByRole("button", { name: "+ Create Collection" });
    const topCta = page.getByRole("button", { name: "New Collection" });
    if (await emptyCta.isVisible().catch(() => false)) await emptyCta.click();
    else await topCta.click();
    await page.locator("#collection-name-modal-input").fill("Keep Me");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText("Keep Me")).toBeVisible();

    // Seed an environment.
    await page.keyboard.press("ControlOrMeta+Shift+E");
    await page.getByPlaceholder("Environment name…").fill("Dev");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.keyboard.press("Escape");

    await page.locator('[aria-label="Settings"]').click();
    await page.getByRole("button", { name: "Data" }).click();

    await expect(page.getByTestId("data-count-history")).toHaveText("1");
    await expect(page.getByTestId("data-count-drafts")).toHaveText("1");
    await expect(page.getByTestId("data-count-environments")).toHaveText("1");
    await expect(page.getByTestId("data-count-collections")).toHaveText("1");

    await page.getByRole("button", { name: "Clear All Data" }).click();

    // History/drafts/environments settle to 0; the collection survives.
    await expect(page.getByTestId("data-count-history")).toHaveText("0");
    await expect(page.getByTestId("data-count-drafts")).toHaveText("0");
    await expect(page.getByTestId("data-count-environments")).toHaveText("0");
    await expect(page.getByTestId("data-count-collections")).toHaveText("1");

    await page.keyboard.press("Escape");
    await sidebarTab(page, "Collections");
    await expect(page.getByText("Keep Me")).toBeVisible();
  });
});
