import { mkdirSync } from "node:fs";
import { test, expect } from "@playwright/test";

const SHOTS = "docs/screenshots";

test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));

test.describe("README screenshots", () => {
  test("library", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("living library");
    await expect(page.locator('a[href^="/s/"]')).toHaveCount(6);
    await expect(page.getByText("Enterprise Deal Review").first()).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/library.png`, animations: "disabled" });
  });

  test("item detail", async ({ page }) => {
    await page.goto("/s/deal-review");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Enterprise Deal Review",
    );
    await expect(page.getByRole("heading", { name: "Recent traces" })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/detail.png`, animations: "disabled" });
  });

  test("connect guide", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByRole("heading", { name: /connect anything/i })).toBeVisible();
    await expect(page.getByText(/claude mcp add agora/)).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/connect.png`, animations: "disabled" });
  });

  test("dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("ava@agora.dev");
    await page.locator('input[name="password"]').fill("password1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("API keys for agents")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/dashboard.png`, animations: "disabled" });
  });
});
