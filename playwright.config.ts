import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Assumes the app + ws server are running (npm run dev:all) and a
 * test database is migrated. CI starts them via the webServer block.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PW_NO_SERVER
    ? undefined
    : {
        command: "npm run dev:all",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
