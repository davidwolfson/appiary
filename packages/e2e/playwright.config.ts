import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4200";
const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3000/api/health";
const apiEnvironment = {
  ...process.env,
  NODE_ENV: "test",
  DB_NAME: process.env.DB_NAME ?? "appiary_test",
} as Record<string, string>;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html"]] : [["list"], ["html"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev:api",
      url: apiURL,
      env: apiEnvironment,
      reuseExistingServer: false,
      cwd: "../../",
      timeout: 120 * 1000,
    },
    {
      command: "npm run dev:web",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      cwd: "../../",
      timeout: 120 * 1000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
