import { test, expect, BASE_URL } from "./fixtures";

test.describe("Agora library — Lightpanda", () => {
  test("gallery exposes ranked cards", async ({ agora }) => {
    const page = await agora.open("/");
    await expect(page.locator("h1")).toContainText("living library");
    await expect(page.locator('a[href^="/s/"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/s/"]')).toHaveCount(6);
  });

  test("item detail exposes content, versions, and traces", async ({ agora }) => {
    const page = await agora.open("/s/deal-review");
    await expect(page.locator("h1")).toContainText("Enterprise Deal Review");
    await expect(page.getByRole("link", { name: /^v\d+\./ }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent traces" })).toBeVisible();
  });

  test("connect guide exposes agent setup commands", async ({ agora }) => {
    const page = await agora.open("/docs");
    await expect(page.getByRole("heading", { name: /connect anything/i })).toBeVisible();
    await expect(page.getByText(/claude mcp add agora/)).toBeVisible();
  });

  test("authenticated session reaches dashboard", async ({ agora }) => {
    const page = await agora.open("/login");
    await expect(page.locator("h1")).toContainText("Sign in");
    const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: BASE_URL,
      },
      body: JSON.stringify({ email: "ava@agora.dev", password: "password1234" }),
    });
    expect(response.status).toBe(200);
    const cookieHeaders = response.headers.getSetCookie();
    await response.arrayBuffer();
    expect(cookieHeaders.length).toBeGreaterThan(0);
    await agora.context.addCookies(
      cookieHeaders.map((header) => {
        const pair = header.split(";", 1)[0];
        const separator = pair.indexOf("=");
        return {
          name: pair.slice(0, separator),
          value: pair.slice(separator + 1),
          url: BASE_URL,
        };
      }),
    );

    await page.locator('a[href="/dashboard"]').evaluate((link) =>
      (link as HTMLAnchorElement).click(),
    );
    await expect.poll(() => new URL(page.url()).pathname).toBe("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("API keys for agents")).toBeVisible();
    await expect(page.getByText("Enterprise Deal Review").first()).toBeVisible();
  });
});
