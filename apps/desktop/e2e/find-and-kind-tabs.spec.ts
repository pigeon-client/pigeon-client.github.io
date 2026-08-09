import { expect, test } from "@playwright/test";
import { clickSend, mockJson, openApp, responseStatus, typeUrl } from "./helpers";

test.describe("contextual ⌘F find", () => {
  test("⌘F in the response panel finds and highlights body matches", async ({ page }) => {
    await openApp(page);
    await mockJson(page, "api.example.com", {
      users: [{ name: "alpha" }, { name: "beta" }, { name: "alpha" }],
    });
    await typeUrl(page, "https://api.example.com/users");
    await clickSend(page);
    await expect(responseStatus(page)).toContainText("200");

    // Focus the response scroll container, then ⌘F opens the in-panel find bar.
    await page.locator('[data-testid="response-body"]:visible').click();
    await page.keyboard.press("ControlOrMeta+f");
    const findInput = page.locator('[data-testid="response-find-input"]:visible');
    await expect(findInput).toBeVisible();
    await findInput.fill("alpha");
    await expect(page.locator('[data-testid="response-find-count"]:visible')).toHaveText("1/2");
    await expect(page.locator('[data-testid="response-find-current"]:visible')).toBeVisible();

    // Enter cycles to the next match.
    await findInput.press("Enter");
    await expect(page.locator('[data-testid="response-find-count"]:visible')).toHaveText("2/2");

    // Esc closes and restores the normal body view.
    await findInput.press("Escape");
    await expect(findInput).not.toBeVisible();
    await expect(page.locator('[data-testid="response-body"]:visible')).toBeVisible();
  });

  test("Enter re-centers the response scroll on each subsequent match, not just the first", async ({
    page,
  }) => {
    await openApp(page);
    // Enough lines that top and bottom matches sit in different scroll positions.
    const obj: Record<string, string> = {};
    for (let i = 0; i < 60; i++) obj[`k${i}`] = i === 1 ? "needle-top" : i === 58 ? "needle-bottom" : "x";
    await mockJson(page, "api.example.com", obj);
    await typeUrl(page, "https://api.example.com/scroll-center");
    await clickSend(page);
    await expect(responseStatus(page)).toContainText("200");

    await page.locator('[data-testid="response-body"]:visible').click();
    await page.keyboard.press("ControlOrMeta+f");
    const findInput = page.locator('[data-testid="response-find-input"]:visible');
    await findInput.fill("needle");
    await expect(page.locator('[data-testid="response-find-count"]:visible')).toHaveText("1/2");

    const scrollContainer = page.locator('[data-testid="response-find-text"]').locator(
      "xpath=ancestor::div[contains(@class,'overflow-auto')][1]",
    );
    const scrollTopAtFirst = await scrollContainer.evaluate((el) => el.scrollTop);

    await findInput.press("Enter");
    await expect(page.locator('[data-testid="response-find-count"]:visible')).toHaveText("2/2");
    const scrollTopAtSecond = await scrollContainer.evaluate((el) => el.scrollTop);

    // The bug: the re-center effect only fired once on mount, so a second match far
    // below the first left scrollTop unchanged. Fixed: Enter must move the scroll.
    expect(scrollTopAtSecond).toBeGreaterThan(scrollTopAtFirst + 100);
  });

  test("find in a JSON response keeps pretty-printed formatting, not the raw single line", async ({
    page,
  }) => {
    await openApp(page);
    await mockJson(page, "api.example.com", { model: "north-mini", output: [{ text: "No." }] });
    await typeUrl(page, "https://api.example.com/find-json");
    await clickSend(page);
    await expect(responseStatus(page)).toContainText("200");
    // Default view is Pretty (multi-line, indented) — confirm before searching.
    await expect(page.locator('[data-testid="response-body"]:visible')).toContainText(
      /"model":\s*"north-mini"/,
    );

    await page.locator('[data-testid="response-body"]:visible').click();
    await page.keyboard.press("ControlOrMeta+f");
    await page.locator('[data-testid="response-find-input"]:visible').fill("no");

    const findText = page.locator('[data-testid="response-find-text"]:visible');
    await expect(findText).toBeVisible();
    // Pretty-printed JSON indents nested keys with 2 spaces — this substring only
    // exists in the formatted output, never in the single-line raw body.
    await expect(findText).toContainText(/\n\s{2}"model"/);
    // Line numbers gutter present (same layout as the non-find CodeBlock view) — the
    // gutter is the first child div, its first row is line 1.
    await expect(findText.locator("> div").first().locator("div").first()).toHaveText("1");
    // Real hljs syntax highlighting survived the mark-insertion (not plain text) —
    // JSON string tokens get hljs's `hljs-string` class.
    await expect(findText.locator(".hljs-string").first()).toBeVisible();
    // The active match is a real, testid-tagged <mark>, not a decoy element.
    const currentMark = page.locator('[data-testid="response-find-current"]:visible');
    await expect(currentMark).toBeVisible();
    await expect(currentMark.evaluate((el) => el.tagName)).resolves.toBe("MARK");
  });

  test("find in an HTML response searches the response text unmodified", async ({ page }) => {
    await openApp(page);
    await page.route(
      (u) => u.href.includes("api.example.com/find-html"),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<html><body><h1>Hello world</h1><p>needle here</p></body></html>",
        }),
    );
    await typeUrl(page, "https://api.example.com/find-html");
    await clickSend(page);
    await expect(responseStatus(page)).toContainText("200");
    // HTML defaults to the sandboxed Preview — switch to Pretty so the raw markup is searchable.
    await page.locator('[data-testid="response-view-pretty"]:visible').click();

    await page.locator('[data-testid="response-body"]:visible').click();
    await page.keyboard.press("ControlOrMeta+f");
    await page.locator('[data-testid="response-find-input"]:visible').fill("needle");
    await expect(page.locator('[data-testid="response-find-count"]:visible')).toHaveText("1/1");
    await expect(page.locator('[data-testid="response-find-text"]:visible')).toContainText(
      "needle here",
    );
  });

  test("⌘F in the body editor opens the body find bar and counts matches", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/users");
    await page.locator('[data-testid="editor-tab-body"]:visible').click();
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    const textarea = page.locator("textarea:visible").first();
    await textarea.fill('{ "token": "aaa", "other": "aaa" }');
    await textarea.press("ControlOrMeta+f");
    const findInput = page.locator('[data-testid="body-find-input"]:visible');
    await expect(findInput).toBeVisible();
    await findInput.fill("aaa");
    await expect(page.locator('[data-testid="body-find-count"]:visible')).toHaveText("1/2");
  });

  test("⌘F outside a panel still focuses the header search", async ({ page }) => {
    await openApp(page);
    await page.keyboard.press("ControlOrMeta+f");
    await expect(page.locator("[data-header-search]")).toBeFocused();
  });
});

test.describe("header icon-button tooltips", () => {
  test("hovering the MCP and GraphQL buttons shows a styled tooltip, not the native title", async ({
    page,
  }) => {
    await openApp(page);
    const mcpButton = page.getByTestId("header-open-mcp");
    await expect(mcpButton).not.toHaveAttribute("title");
    await mcpButton.hover();
    await expect(page.getByRole("tooltip", { name: "MCP — coming soon (⌘⇧M)" })).toBeVisible();
    await page.mouse.move(10, 400);
    await expect(page.getByRole("tooltip")).toHaveCount(0);

    const graphqlButton = page.getByTestId("header-open-graphql");
    await graphqlButton.hover();
    await expect(
      page.getByRole("tooltip", { name: "GraphQL — coming soon (⌘⇧G)" }),
    ).toBeVisible();
  });

  test("keyboard focus also shows the tooltip (accessible, not hover-only)", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("header-open-mcp").focus();
    await expect(page.getByRole("tooltip", { name: "MCP — coming soon (⌘⇧M)" })).toBeVisible();
  });
});

test.describe("workspace coming-soon pages", () => {
  test("MCP opens in-place — no new tab, no sidebar", async ({ page }) => {
    await openApp(page);
    const tabsBefore = await page.getByRole("tab").count();
    await page.getByTestId("header-open-mcp").click();
    await expect(page.getByTestId("mcp-coming-soon")).toBeVisible();
    await expect(page.locator('[data-testid="url-input"]:visible')).toHaveCount(0);
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByTestId("header-open-mcp")).toHaveAttribute("data-state", "active");

    await page.getByTestId("header-open-rest").click();
    await expect(page.getByRole("tab")).toHaveCount(tabsBefore);
  });

  test("GraphQL opens in-place via ⌘⇧G — no new tab", async ({ page }) => {
    await openApp(page);
    await page.keyboard.press("ControlOrMeta+Shift+g");
    await expect(page.getByTestId("graphql-coming-soon")).toBeVisible();
    await expect(page.getByTestId("graphql-coming-soon")).toContainText("coming soon");
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.locator('[data-testid="url-input"]:visible')).toHaveCount(0);
  });
});
