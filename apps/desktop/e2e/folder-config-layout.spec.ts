import { expect, test } from "@playwright/test";
import { openApp, sidebarTab } from "./helpers";

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
