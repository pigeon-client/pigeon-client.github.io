import { expect, test } from "@playwright/test";
import { editorTab, openApp, typeUrl } from "./helpers";

test.describe("body editor", () => {
  test("Raw body with Text/XML format dropdown", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/things");

    await editorTab(page, "Body");
    await page.getByRole("button", { name: "Raw", exact: true }).click();

    // Format dropdown defaults to Text; open it and pick XML.
    await page.getByRole("button", { name: /Text/ }).click();
    await page.getByRole("button", { name: "XML", exact: true }).click();
    await expect(page.getByRole("button", { name: /XML/ })).toBeVisible();
  });

  test("JSON body accepts input", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/things");

    await editorTab(page, "Body");
    await page.getByRole("button", { name: "JSON", exact: true }).click();

    const editor = page.locator("textarea").last();
    await editor.click();
    await editor.fill('{"hello":"world"}');
    await expect(editor).toHaveValue('{"hello":"world"}');
  });
});
