import { expect, test } from "@playwright/test";
import {
  clickSend,
  mockJson,
  openAppForOnboarding,
  responseStatus,
  urlInput,
} from "./helpers";

test.describe("onboarding", () => {
  test("walks URL → Send and dismisses after the first request", async ({ page }) => {
    await openAppForOnboarding(page);
    await mockJson(page, "jsonplaceholder.typicode.com", {
      userId: 1,
      id: 1,
      title: "delectus aut autem",
      completed: false,
    });

    await expect(page.getByTestId("onboarding")).toHaveAttribute(
      "data-onboarding-step",
      "welcome",
    );
    await page.getByTestId("onboarding-start").click();

    await expect(page.getByTestId("onboarding")).toHaveAttribute("data-onboarding-step", "url");
    await expect(urlInput(page)).toHaveValue(/jsonplaceholder/);
    await page.getByTestId("onboarding-next").click();

    await expect(page.getByTestId("onboarding")).toHaveAttribute("data-onboarding-step", "send");
    await clickSend(page);

    await expect(page.getByTestId("onboarding")).toHaveCount(0);
    await expect(page.getByTestId("onboarding-toast")).toBeVisible();
    await expect(responseStatus(page)).toContainText("200");
  });

  test("Skip completes onboarding without sending", async ({ page }) => {
    await openAppForOnboarding(page);
    await page.getByTestId("onboarding-skip").click();
    await expect(page.getByTestId("onboarding")).toHaveCount(0);
    await expect(page.getByText("No request open")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("onboarding")).toHaveCount(0);
  });

  test("does not show when a request is already open", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        "pg_open_tabs:rest",
        JSON.stringify({
          activeTabId: "tab-1",
          tabs: [
            {
              id: "tab-1",
              kind: "http",
              name: "/users",
              nameLocked: false,
              request: { url: "https://api.example.com/users", method: "GET" },
              collectionRef: null,
            },
          ],
        }),
      );
    });
    await page.reload();
    await expect(urlInput(page)).toHaveValue(/api.example.com/);
    await expect(page.getByTestId("onboarding")).toHaveCount(0);
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem("pg_onboarding_complete")),
      )
      .toBe("true");

    await page.reload();
    await expect(page.getByTestId("onboarding")).toHaveCount(0);
  });
});
