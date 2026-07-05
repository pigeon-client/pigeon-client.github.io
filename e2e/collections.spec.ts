import { expect, test } from "@playwright/test";
import { openApp, sidebarTab } from "./helpers";

async function createCollection(page: import("@playwright/test").Page, name: string) {
  // First collection uses the empty-state CTA; later ones the top button.
  const emptyCta = page.getByRole("button", { name: "+ Create Collection" });
  const topCta = page.getByRole("button", { name: "New Collection" });
  if (await emptyCta.isVisible().catch(() => false)) await emptyCta.click();
  else await topCta.click();

  await page.locator("#collection-name-modal-input").fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();
}

test.describe("collections", () => {
  test("creates a collection and persists it across reload", async ({ page }) => {
    await openApp(page);
    await sidebarTab(page, "Collections");

    await createCollection(page, "My API");
    await expect(page.getByText("My API")).toBeVisible();

    // Browser adapter persists to localStorage → survives reload.
    await page.reload();
    await sidebarTab(page, "Collections");
    await expect(page.getByText("My API")).toBeVisible();
  });
});
