import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  webServer: {
    command: "npx next start -p 3100",
    url: baseURL,
    env: {
      BETTER_AUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
    },
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "lightpanda",
      testMatch: /lightpanda\.spec\.ts/,
    },
    {
      name: "chromium",
      testMatch: /(instant|screenshots)\.spec\.ts/,
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
