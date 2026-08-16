import { expect, test } from "@playwright/test";
import { openApp, sidebarTab, typeUrl } from "./helpers";

async function createCollection(page: import("@playwright/test").Page, name: string) {
  const emptyCta = page.getByRole("button", { name: "+ Create Collection" });
  await emptyCta.click();
  await page.locator("#collection-name-modal-input").fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();
}

async function openFolderConfigModal(page: import("@playwright/test").Page, folderName: string) {
  const sidebar = page.getByRole("complementary");
  const folderRow = sidebar.getByText(folderName, { exact: true }).locator("..");
  await folderRow.hover();
  await folderRow.getByRole("button", { name: "Folder headers/auth" }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "headers & auth" });
  await dialog.waitFor();
  await page.waitForTimeout(300);
  return dialog;
}

test.describe("folder config modal layout", () => {
  test("request editor content does not bleed over the description", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: "Try an example" }).click();
    await page.getByTestId("editor-tab-headers").click();

    await sidebarTab(page, "Collections");
    await createCollection(page, "pollinations.ai");

    const sidebar = page.getByRole("complementary");
    const collectionRow = sidebar.getByText("pollinations.ai", { exact: true }).locator("..");
    await collectionRow.hover();
    await collectionRow.getByRole("button", { name: "Add folder" }).click();
    await page.locator("#collection-name-modal-input").fill("API");
    await page.getByRole("dialog").getByRole("button", { name: "Create", exact: true }).click();

    const dialog = await openFolderConfigModal(page, "API");

    const hit = await page.evaluate(() => {
      const modal = [...document.querySelectorAll('[role="dialog"]')].find((d) =>
        d.textContent?.includes("headers & auth"),
      );
      const desc = modal?.querySelector("p");
      const rect = desc?.getBoundingClientRect();
      if (!rect) return null;
      const x = rect.left + rect.width * 0.7;
      const y = rect.top + rect.height / 2;
      const top = document.elementFromPoint(x, y);
      return {
        x,
        y,
        topTag: top?.tagName,
        topText: top?.textContent?.slice(0, 40),
        modalContainsTop: modal?.contains(top ?? null),
        backdropZ: getComputedStyle(
          document.querySelector('[aria-label="Close modal"]') as Element,
        ).zIndex,
      };
    });

    expect(hit).toBeTruthy();
    expect(hit!.modalContainsTop).toBe(true);
    expect(Number(hit!.backdropZ)).toBeGreaterThanOrEqual(50);

    await expect(dialog.locator("p").first()).toContainText("Inherited by every request");
    await expect(dialog.getByText("application/json")).toHaveCount(0);
  });
});

test.describe("folder header inheritance", () => {
  test("folder config headers appear in nested request editor", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/nested");

    await sidebarTab(page, "Collections");
    await createCollection(page, "Inherit Headers");

    const sidebar = page.getByRole("complementary");
    const collectionRow = sidebar.getByText("Inherit Headers", { exact: true }).locator("..");
    await collectionRow.hover();
    await collectionRow.getByRole("button", { name: "Add folder" }).click();
    await page.locator("#collection-name-modal-input").fill("API");
    await page.getByRole("dialog").getByRole("button", { name: "Create", exact: true }).click();

    const dialog = await openFolderConfigModal(page, "API");
    await dialog.getByTestId("folder-config-tab-headers").click();
    await dialog.getByTestId("folder-header-key-0").fill("X-Custom");
    await dialog.getByTestId("folder-header-value-0").fill("inherited");
    await expect(dialog.getByTestId("folder-header-key-0")).toHaveValue("X-Custom");
    await expect(dialog.getByTestId("folder-header-value-0")).toHaveValue("inherited");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toBeHidden();

    // Browser DB update waits on a Tauri IPC probe (~2s) before Zustand commits.
    // Re-open until the folder modal shows the saved row, then close it.
    await expect(async () => {
      const again = await openFolderConfigModal(page, "API");
      try {
        await expect(again.getByTestId("folder-header-key-0")).toHaveValue("X-Custom", {
          timeout: 500,
        });
        await expect(again.getByTestId("folder-header-value-0")).toHaveValue("inherited", {
          timeout: 500,
        });
      } finally {
        await again.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(again).toBeHidden();
      }
    }).toPass({ timeout: 10_000 });

    const folderRow = sidebar.getByText("API", { exact: true }).locator("..");
    await folderRow.hover();
    await folderRow.getByRole("button", { name: "Add current request" }).click();
    await page.locator("#collection-name-modal-input").fill("Login");
    await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
    await expect(sidebar.getByText("Login", { exact: true })).toBeVisible({ timeout: 10_000 });

    await sidebar.getByText("Login", { exact: true }).click();
    await expect(page.locator('[data-testid="url-input"]:visible')).toHaveValue(
      "https://api.example.com/nested",
    );
    await page.locator('[data-testid="editor-tab-headers"]:visible').click();

    await expect(page.locator('[data-testid="header-key-0"]:visible')).toHaveValue("X-Custom");
    await expect(page.locator('[data-testid="header-value-0"]:visible')).toHaveValue("inherited");
  });
});
