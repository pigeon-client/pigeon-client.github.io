import { expect, test } from "@playwright/test";
import { openApp, sidebarTab, typeUrl } from "./helpers";

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

  test("rename, nested folder save/reopen, and delete (folder + collection)", async ({ page }) => {
    // Confirm() dialogs default to dismiss under Playwright — accept them so
    // delete flows actually run instead of silently no-op'ing.
    page.on("dialog", (d) => d.accept());

    await openApp(page);
    await typeUrl(page, "https://api.example.com/login");

    await sidebarTab(page, "Collections");
    await createCollection(page, "QA Nest");
    const sidebar = page.getByRole("complementary");
    const collectionRow = sidebar.getByText("QA Nest", { exact: true }).locator("..");

    // Rename the collection.
    await collectionRow.hover();
    await collectionRow.getByRole("button", { name: "Rename" }).click();
    await page.locator("#collection-name-modal-input").fill("QA Nest Renamed");
    await page.getByRole("dialog").getByRole("button", { name: "Rename", exact: true }).click();
    await expect(sidebar.getByText("QA Nest Renamed", { exact: true })).toBeVisible();

    const renamedRow = sidebar.getByText("QA Nest Renamed", { exact: true }).locator("..");
    await renamedRow.hover();
    await renamedRow.getByRole("button", { name: "Add folder" }).click();
    await page.locator("#collection-name-modal-input").fill("Auth");
    await page.getByRole("dialog").getByRole("button", { name: "Create", exact: true }).click();
    await expect(sidebar.getByText("Auth", { exact: true })).toBeVisible();

    // Save the active request (POST/login typed above) into the new folder.
    const folderRow = sidebar.getByText("Auth", { exact: true }).locator("..");
    await folderRow.hover();
    await folderRow.getByRole("button", { name: "Add current request" }).click();
    await page.locator("#collection-name-modal-input").fill("Login");
    await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
    await expect(sidebar.getByText("Login", { exact: true })).toBeVisible();

    // Reopen from the tree loads the same URL in a tab.
    await sidebar.getByText("Login", { exact: true }).click();
    await expect(page.locator('[data-testid="url-input"]:visible')).toHaveValue(
      "https://api.example.com/login",
    );

    // Delete the folder — its nested request goes with it.
    await folderRow.hover();
    await folderRow.getByRole("button", { name: "Delete" }).click();
    await expect(sidebar.getByText("Auth", { exact: true })).not.toBeVisible();
    await expect(sidebar.getByText("Login", { exact: true })).not.toBeVisible();

    // Delete the (now-empty) collection.
    await renamedRow.hover();
    await renamedRow.getByRole("button", { name: "Delete" }).click();
    await expect(sidebar.getByText("QA Nest Renamed", { exact: true })).not.toBeVisible();
  });
});
