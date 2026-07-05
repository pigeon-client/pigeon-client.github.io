import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;
const PORT = 1420;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Browser E2E for the Pigeon web build (`pnpm dev`). The Tauri backend is
 * absent, so the app runs on its browser adapters (localStorage + fetch); specs
 * stub the network with route mocks for determinism. Real-backend coverage is a
 * separate tauri-driver concern.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
