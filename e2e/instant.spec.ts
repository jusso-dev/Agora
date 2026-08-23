import { instant } from "@next/playwright";
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

/**
 * Instant-navigation regression tests using the @next/playwright `instant()`
 * helper. These depend on the Next.js testing API and full CDP lifecycle
 * events, so they run against real Chromium (project "chromium"):
 *   npx playwright install chromium && npm run e2e:instant
 */

test.describe("instant navigation", () => {
  test("home to item detail is instant on client nav", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    const href = "/s/deal-review";
    await expect(page.locator(`a[href="${href}"]`)).toBeVisible();

    await instant(
      page,
      async () => {
        await page.click(`a[href="${href}"]`);
        await page.waitForURL((u) => u.pathname === href);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          "Enterprise Deal Review",
        );
      },
      { baseURL: BASE_URL },
    );

    await expect(page.getByRole("heading", { name: "Versions" })).toBeVisible();
  });

  test("item detail back to library is instant", async ({ page }) => {
    await page.goto(`${BASE_URL}/s/pr-review`);
    await expect(page.locator("h1")).toContainText("PR Review");

    await instant(
      page,
      async () => {
        await page.locator('a[href="/"]').first().click();
        await page.waitForURL((u) => u.pathname === "/");
        await expect(page.getByRole("heading", { level: 1 })).toContainText("living library");
      },
      { baseURL: BASE_URL },
    );
  });
});
