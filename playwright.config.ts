import { defineConfig, devices } from "@playwright/test";
const live = process.env.KPOP_E2E_LIVE === "1";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: live ? "http://localhost:3000" : "http://localhost:3001",
    trace: "retain-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  testIgnore: live ? /public\.spec\.ts/ : /accounts\.spec\.ts/,
  webServer: live
    ? undefined
    : [
        {
          command: "node tests/fixtures/api.mjs",
          url: "http://127.0.0.1:8081/health",
          reuseExistingServer: false,
        },
        {
          command: "node node_modules/next/dist/bin/next dev --port 3001",
          url: "http://localhost:3001",
          reuseExistingServer: false,
          timeout: 120000,
          env: {
            API_BASE_URL: "http://127.0.0.1:8081/api",
            BTS_BUILD_DIR: ".next-e2e",
          },
        },
      ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
