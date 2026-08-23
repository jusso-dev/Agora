import { test as base, chromium, expect, type BrowserContext, type Page } from "@playwright/test";

export const CDP_URL = process.env.LIGHTPANDA_CDP ?? "http://127.0.0.1:9222";
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

/**
 * Lightpanda does not emit frame-lifecycle CDP events, so `page.goto()` never
 * resolves. Navigation works by creating targets with the URL directly
 * (Target.createTarget); we then wait for the page to appear in the context.
 */
async function open(
  context: BrowserContext,
  browser: Awaited<ReturnType<typeof chromium.connectOverCDP>>,
  path: string,
): Promise<Page> {
  const before = context.pages().length;
  const session = await browser.newBrowserCDPSession();
  await session.send("Target.createTarget", { url: `${BASE_URL}${path}` });
  session.detach().catch(() => {});

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const pages = context.pages();
    if (pages.length > before) return pages.at(-1)!;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out opening ${path} via CDP`);
}

export const test = base.extend<{
  agora: { context: BrowserContext; open: (path: string) => Promise<Page> };
}>({
  agora: [
    async ({}, use) => {
      const browser = await chromium.connectOverCDP(CDP_URL);
      const context = browser.contexts()[0];
      if (!context) throw new Error(`No browser context over CDP at ${CDP_URL}`);
      await use({ context, open: (path) => open(context, browser, path) });
      await browser.close();
    },
    { scope: "test" },
  ],
});

export { expect };
