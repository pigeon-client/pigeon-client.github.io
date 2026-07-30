import { expect, test } from "@playwright/test";
import { methodTrigger, openApp, typeUrl, urlInput } from "./helpers";

test.describe("cURL import", () => {
  test("typing a curl command into the URL bar parses it", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "curl -X POST https://api.example.com/login");

    // Method lifts to POST, URL is set to the parsed target.
    await expect(methodTrigger(page)).toContainText("POST");
    await expect(urlInput(page)).toHaveValue(/api\.example\.com\/login/);
  });

  test("the Import modal parses a curl command into a new tab", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("sidebar-import").click();

    await page.getByTestId("import-curl-textarea").fill("curl -X PUT https://api.example.com/items/7");
    await page.getByTestId("import-curl-submit").click();

    await expect(methodTrigger(page)).toContainText("PUT");
    await expect(urlInput(page)).toHaveValue(/items\/7/);
  });

  test("an invalid curl command in the Import modal shows an error, not a crash", async ({
    page,
  }) => {
    await openApp(page);
    await page.getByTestId("sidebar-import").click();

    await page.getByTestId("import-curl-textarea").fill("curl this is not a valid command ---");
    await page.getByTestId("import-curl-submit").click();

    await expect(page.getByText(/Could not parse this cURL/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(urlInput(page)).toBeVisible(); // app didn't crash, still usable
  });
});
