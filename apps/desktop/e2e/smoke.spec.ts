import { expect, test } from "@playwright/test";
import { openApp, typeUrl, urlInput } from "./helpers";

test.describe("smoke", () => {
  test("app boots with the shell and the empty-request state", async ({ page }) => {
    await openApp(page);

    // Brand + core chrome present.
    await expect(page.getByText("Pigeon", { exact: true })).toBeVisible();
    await expect(urlInput(page)).toBeVisible();
    await expect(page.locator("[data-send-btn]")).toBeVisible();

    // No URL yet → empty-request state with its CTA.
    await expect(page.getByText("No request open")).toBeVisible();
    await expect(page.getByRole("button", { name: /Try an example/ })).toBeVisible();

    // Typing a URL reveals the editor + response panel.
    await typeUrl(page, "https://api.example.com/users");
    await expect(page.getByText("Params", { exact: true })).toBeVisible();
    await expect(page.getByTestId("response-empty")).toBeVisible();
  });

  test("sidebar exposes History / Draft / Collections", async ({ page }) => {
    await openApp(page);
    for (const name of ["History", "Draft", "Collections"] as const) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
  });

  test("sidebar collapses and expands", async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId("sidebar-new-request")).toBeVisible();

    await page.getByTestId("sidebar-collapse").click();
    await expect(page.getByTestId("sidebar-new-request")).toBeHidden();
    await expect(page.getByTestId("sidebar-expand")).toBeVisible();

    await page.getByTestId("sidebar-expand").click();
    await expect(page.getByTestId("sidebar-new-request")).toBeVisible();
  });

  test("response resize keeps the panel reachable and double-click resets the split", async ({
    page,
  }) => {
    await openApp(page);

    await typeUrl(page, "https://api.example.com/users");

    const handle = page.getByTestId("response-resize-handle");
    const emptyResponse = page.getByTestId("response-empty");
    const startBox = await emptyResponse.boundingBox();
    expect(startBox).not.toBeNull();

    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, page.viewportSize()!.height - 1);
    await page.mouse.up();

    const clampedBox = await emptyResponse.boundingBox();
    expect(clampedBox).not.toBeNull();
    expect(clampedBox!.height).toBeGreaterThanOrEqual(150);

    await handle.dblclick();
    const resetBox = await emptyResponse.boundingBox();
    expect(resetBox).not.toBeNull();
    expect(resetBox!.height).toBeGreaterThan(clampedBox!.height);
  });
});
