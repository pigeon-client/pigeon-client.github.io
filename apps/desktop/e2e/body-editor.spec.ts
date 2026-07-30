import { expect, test } from "@playwright/test";
import { clickSend, editorTab, openApp, typeUrl } from "./helpers";

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

  test("URL Encoded body serializes key/value rows as form-urlencoded", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/things");
    await editorTab(page, "Body");
    await page.getByRole("button", { name: "URL Encoded", exact: true }).click();

    const keyInputs = page.locator('input[placeholder="Key"]');
    const valueInputs = page.locator('input[placeholder="Value"]');
    await keyInputs.nth(0).fill("a");
    await valueInputs.nth(0).fill("1 space");
    await keyInputs.nth(1).fill("b");
    await valueInputs.nth(1).fill("2");

    let seenBody: string | null = null;
    let seenContentType: string | undefined;
    await page.route(
      (u) => u.href.includes("api.example.com"),
      (route) => {
        seenBody = route.request().postData();
        seenContentType = route.request().headers()["content-type"];
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      },
    );

    // GET never sends a body — switch to POST first.
    await page.getByTestId("method-trigger").click();
    await page.getByTestId("method-option-POST").click();
    await clickSend(page);

    expect(seenBody).toBe("a=1+space&b=2");
    expect(seenContentType).toBe("application/x-www-form-urlencoded");
  });
});
