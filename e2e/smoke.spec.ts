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
});
