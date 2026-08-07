import { resolve } from "node:path";

import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

import { resolveRealApiEnvironment } from "./helpers/real-api-environment";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4200";
const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3000/api/health";
const rootEnvironment = config({
  path: resolve(__dirname, "../../.env"),
  processEnv: {},
}).parsed;
const apiEnvironment = resolveRealApiEnvironment(process.env, rootEnvironment);
Object.assign(process.env, apiEnvironment);

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
