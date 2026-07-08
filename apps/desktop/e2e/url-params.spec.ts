import { expect, test } from "@playwright/test";
import { editorTab, openApp, typeUrl, urlInput } from "./helpers";

test.describe("URL ↔ Params sync", () => {
  test("a typed query populates the Params editor", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/search?q=pigeon&page=2");

    await editorTab(page, "Params");

    await expect(page.getByTestId("param-key-0")).toHaveValue("q");
    await expect(page.getByTestId("param-value-0")).toHaveValue("pigeon");
    await expect(page.getByTestId("param-key-1")).toHaveValue("page");
    await expect(page.getByTestId("param-value-1")).toHaveValue("2");
  });

  test("editing a param rewrites the URL query", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/search?q=old");

    await editorTab(page, "Params");
    await page.getByTestId("param-value-0").fill("new");

    await expect(urlInput(page)).toHaveValue("https://api.example.com/search?q=new");
  });
});
