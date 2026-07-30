import { expect, test } from "@playwright/test";
import { editorTab, openApp, typeUrl, urlInput } from "./helpers";

test.describe("long URL / long value overflow", () => {
  test("a ~3KB URL supports End-key + horizontal scroll without breaking layout", async ({
    page,
  }) => {
    await openApp(page);
    const longPath = `/${"segment".repeat(430)}`; // ~3KB
    const longUrl = `https://api.example.com${longPath}`;
    await typeUrl(page, longUrl);

    const input = urlInput(page);
    await expect(input).toHaveValue(longUrl);
    await input.press("End");

    const scrollLeft = await input.evaluate((el: HTMLInputElement) => el.scrollLeft);
    expect(scrollLeft).toBeGreaterThan(0);

    // The transparent input + tint overlay must not blow out page layout.
    const overflowsPage = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflowsPage).toBe(false);
  });

  test("a 600+ char header value supports End-key + horizontal scroll", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/things");
    await editorTab(page, "Headers");

    const longToken = `Bearer ${"x".repeat(600)}`;
    const valueInput = page.getByTestId("header-value-0");
    await page.getByTestId("header-key-0").fill("Authorization");
    await valueInput.fill(longToken);
    await expect(valueInput).toHaveValue(longToken);

    await valueInput.press("End");
    const scrollLeft = await valueInput.evaluate((el: HTMLInputElement) => el.scrollLeft);
    expect(scrollLeft).toBeGreaterThan(0);

    const overflowsPage = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflowsPage).toBe(false);
  });

  test("25 header rows scroll vertically to reach the last row", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/things");
    await editorTab(page, "Headers");

    // Typing into the trailing blank row auto-appends the next one.
    for (let i = 0; i < 25; i++) {
      await page.getByTestId(`header-key-${i}`).fill(`X-Custom-${i}`);
    }

    const lastRow = page.getByTestId("header-key-24");
    await lastRow.scrollIntoViewIfNeeded();
    await expect(lastRow).toBeVisible();
    await expect(lastRow).toHaveValue("X-Custom-24");
  });
});
