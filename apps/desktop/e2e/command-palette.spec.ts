import { expect, test } from "@playwright/test";
import {
  clickSend,
  methodTrigger,
  mockJson,
  openApp,
  responseStatus,
  sidebarTab,
  typeUrl,
  urlInput,
} from "./helpers";

async function createCollection(page: import("@playwright/test").Page, name: string) {
  const emptyCta = page.getByRole("button", { name: "+ Create Collection" });
  const topCta = page.getByRole("button", { name: "New Collection" });
  if (await emptyCta.isVisible().catch(() => false)) await emptyCta.click();
  else await topCta.click();
  await page.locator("#collection-name-modal-input").fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();
}

async function setPostJsonBody(page: import("@playwright/test").Page, body: string) {
  await methodTrigger(page).click();
  await page.getByTestId("method-option-POST").click();
  await page.getByTestId("editor-tab-body").click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const editor = page.locator("textarea").last();
  await editor.click();
  await editor.fill(body);
}

test.describe("command palette", () => {
  test("finds a saved collection request by body text and opens it", async ({ page }) => {
    await openApp(page);

    // Build a request, then save it into a fresh collection — never sent, so
    // this row can only come from the collections source.
    await sidebarTab(page, "Collections");
    await createCollection(page, "My API");

    await typeUrl(page, "https://api.example.com/widgets");
    await setPostJsonBody(page, '{"marker":"zzz-widget-marker"}');
    await page.keyboard.press("ControlOrMeta+Shift+s");
    await expect(page.getByText("Save to Collection")).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Save to Collection")).not.toBeVisible();

    // Open a fresh tab so the palette has to open a *new* tab, not reuse this one.
    await page.keyboard.press("ControlOrMeta+Shift+n");

    await page.keyboard.press("ControlOrMeta+Shift+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await page.getByTestId("command-palette-input").fill("zzz-widget-marker");

    const result = page.getByTestId("command-palette-result-0");
    await expect(result).toBeVisible();
    await expect(result).toContainText("POST");
    await expect(result).toContainText("My API");
    await result.click();

    await expect(page.getByTestId("command-palette")).not.toBeVisible();
    await expect(urlInput(page)).toHaveValue("https://api.example.com/widgets");
    await expect(methodTrigger(page)).toContainText("POST");
  });

  test("finds a sent request (history + draft) by URL and opens it via keyboard", async ({
    page,
  }) => {
    await openApp(page);
    await mockJson(page, "api.example.com/orders", { ok: true });

    await typeUrl(page, "https://api.example.com/orders");
    await clickSend(page);
    await expect(responseStatus(page)).toContainText("200");

    await page.keyboard.press("ControlOrMeta+Shift+n");
    await page.keyboard.press("ControlOrMeta+Shift+k");
    await page.getByTestId("command-palette-input").fill("orders");

    await expect(page.getByTestId("command-palette-result-0")).toBeVisible();
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("command-palette")).not.toBeVisible();
    await expect(urlInput(page)).toHaveValue("https://api.example.com/orders");
  });

  test("Escape closes the palette without changing the active tab", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/keep-me");

    await page.keyboard.press("ControlOrMeta+Shift+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette")).not.toBeVisible();
    await expect(urlInput(page)).toHaveValue("https://api.example.com/keep-me");
  });
});
