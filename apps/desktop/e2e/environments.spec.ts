import { expect, test } from "@playwright/test";
import { clickSend, editorTab, openApp, typeUrl, urlInput } from "./helpers";

// Open the Environment Manager (⌘⇧E) reliably.
async function openManager(page: import("@playwright/test").Page) {
  await urlInput(page).click();
  await expect(async () => {
    await page.keyboard.press("ControlOrMeta+Shift+E");
    await expect(page.getByText("Environment Manager")).toBeVisible({ timeout: 1000 });
  }).toPass();
}

async function createEnv(page: import("@playwright/test").Page, name: string) {
  await page.getByPlaceholder("Environment name…").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
}

test.describe("environments", () => {
  test("create env + variable, set active, and it persists across reload", async ({ page }) => {
    await openApp(page);
    await openManager(page);

    await createEnv(page, "Dev");
    await page.getByTestId("env-key-0").fill("base");
    await page.getByTestId("env-value-0").fill("https://api.example.com");
    await page.getByRole("button", { name: "Set active" }).click();
    await page.keyboard.press("Escape");

    // Header selector reflects the active env.
    await expect(page.getByTestId("env-selector")).toContainText("Dev");

    // Browser build persists to localStorage → survives reload.
    await page.reload();
    await expect(page.getByTestId("env-selector")).toContainText("Dev");
  });

  test("unresolved {{var}} blocks the send with an error", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/{{missing}}");
    await clickSend(page);

    await expect(page.getByTestId("send-error")).toContainText("Unresolved variable: missing");
    // No response was produced.
    await expect(page.getByTestId("response-empty")).toBeVisible();
  });

  test("a defined variable resolves and the request sends", async ({ page }) => {
    await openApp(page);
    await openManager(page);
    await createEnv(page, "Dev");
    await page.getByTestId("env-key-0").fill("host");
    await page.getByTestId("env-value-0").fill("api.example.com");
    await page.getByRole("button", { name: "Set active" }).click();
    await page.keyboard.press("Escape");

    await page.route((u) => u.href.includes("api.example.com"), (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }),
    );
    await typeUrl(page, "https://{{host}}/ping");
    await clickSend(page);
    await expect(page.locator('[data-testid="response-status"]:visible')).toContainText("200");
  });

  test("hovering a {{token}} in the URL shows its resolved value", async ({ page }) => {
    await openApp(page);
    await openManager(page);
    await createEnv(page, "Dev");
    await page.getByTestId("env-key-0").fill("host");
    await page.getByTestId("env-value-0").fill("api.example.com");
    await page.getByRole("button", { name: "Set active" }).click();
    await page.keyboard.press("Escape");

    await typeUrl(page, "https://{{host}}/ping");
    await page.getByTestId("env-token").first().hover();
    await expect(page.getByText("api.example.com")).toBeVisible();
  });

  test("typing {{ shows a variable autocomplete and inserts on select", async ({ page }) => {
    await openApp(page);
    const input = urlInput(page);
    await input.click();
    // Random built-ins are always available; filter to $uuid.
    await input.pressSequentially("https://x/{{uui");
    await expect(page.getByTestId("var-suggestion").filter({ hasText: "$uuid" })).toBeVisible();
    await input.press("Enter");
    await expect(input).toHaveValue("https://x/{{$uuid}}");
  });

  test("arrow keys navigate the whole suggestion list", async ({ page }) => {
    await openApp(page);
    const input = urlInput(page);
    await input.click();
    await input.pressSequentially("{{");
    // 4 built-ins: $email, $firstName, $lastName, $uuid
    await expect(page.getByTestId("var-suggestion")).toHaveCount(4);
    await input.press("ArrowDown");
    await input.press("ArrowDown");
    await input.press("ArrowDown"); // reaches the last item
    await input.press("Enter");
    await expect(input).toHaveValue("{{$uuid}}");
  });

  test("{{ autocomplete works in param values and the body", async ({ page }) => {
    await openApp(page);
    await typeUrl(page, "https://api.example.com/x");

    // Param value
    await editorTab(page, "Params");
    const pv = page.getByTestId("param-value-0");
    await pv.click();
    await pv.pressSequentially("{{$uui");
    await expect(page.getByTestId("var-suggestion").filter({ hasText: "$uuid" })).toBeVisible();
    await pv.press("Enter");
    await expect(pv).toHaveValue("{{$uuid}}");

    // Body (JSON) — auto-closed braces are handled
    await editorTab(page, "Body");
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    const ta = page.locator("textarea").last();
    await ta.click();
    await ta.pressSequentially("{{$uui");
    await expect(page.getByTestId("var-suggestion").filter({ hasText: "$uuid" })).toBeVisible();
    await ta.press("Enter");
    await expect(ta).toHaveValue("{{$uuid}}");
  });

  test("marking an environment production shows red cues", async ({ page }) => {
    await openApp(page);
    await openManager(page);
    await createEnv(page, "Prod");
    await page.getByTestId("env-prod-checkbox").check();
    await page.getByRole("button", { name: "Set active" }).click();
    await page.keyboard.press("Escape");

    // Persistent red border around the request-builder panel + red selector.
    await expect(page.getByTestId("env-prod-indicator")).toBeVisible();
  });
});
