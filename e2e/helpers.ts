import { expect, type Page } from "@playwright/test";

/** Open the app with a clean localStorage (fresh browser DB per test). */
export async function openApp(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("url-input")).toBeVisible();
}

// Inactive tabs stay mounted (display:none), so testids duplicate across tabs.
// Scope the interactive ones to the visible (active) tab.
export function urlInput(page: Page) {
  return page.locator('[data-testid="url-input"]:visible');
}

export function methodTrigger(page: Page) {
  return page.locator('[data-testid="method-trigger"]:visible');
}

export function responseStatus(page: Page) {
  return page.locator('[data-testid="response-status"]:visible');
}

export function responseBody(page: Page) {
  return page.locator('[data-testid="response-body"]:visible');
}

/** Type a URL into the URL bar (replacing any existing value). */
export async function typeUrl(page: Page, url: string) {
  const input = urlInput(page);
  await input.click();
  await input.fill(url);
}

/** Click Send. */
export async function clickSend(page: Page) {
  await page.locator("[data-send-btn]").click();
}

/** Stub every request to `host` (substring match) with a JSON body. */
export async function mockJson(
  page: Page,
  match: string,
  json: unknown,
  status = 200,
) {
  await page.route(
    (url) => url.href.includes(match),
    (route) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(json),
      }),
  );
}

/** Switch a sidebar tab (History / Draft / Collections) by stable test id. */
export async function sidebarTab(page: Page, name: "History" | "Draft" | "Collections") {
  await page.getByTestId(`sidebar-tab-${name.toLowerCase()}`).click();
}

/** A request-editor tab (Params / Auth / Headers / Body) by stable test id. */
export async function editorTab(page: Page, name: "Params" | "Auth" | "Headers" | "Body") {
  await page.getByTestId(`editor-tab-${name.toLowerCase()}`).click();
}
