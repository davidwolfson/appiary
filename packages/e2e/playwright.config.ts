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

const supportedLanes = ["all", "mocked", "real", "browser-smoke"] as const;
const requestedLane = process.env.PLAYWRIGHT_LANE ?? "all";

if (!supportedLanes.includes(requestedLane as (typeof supportedLanes)[number])) {
  throw new Error(
    `PLAYWRIGHT_LANE must be one of ${supportedLanes.join(", ")}; received "${requestedLane}".`,
  );
}

const lane = requestedLane as (typeof supportedLanes)[number];
const reportDirectory = `playwright-report/${lane}`;
const resultDirectory = `test-results/${lane}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    [process.env.CI ? "github" : "list"],
    ["html", { outputFolder: reportDirectory, open: "never" }],
    ["junit", { outputFile: `${resultDirectory}/junit.xml` }],
  ],
  outputDir: `${resultDirectory}/artifacts`,
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
    {
      name: "firefox-desktop",
      grep: /@browser-smoke/,
      grepInvert: /@real-api/,
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "webkit-desktop",
      grep: /@browser-smoke/,
      grepInvert: /@real-api/,
      use: {
        ...devices["Desktop Safari"],
      },
    },
    {
      name: "pixel-7",
      grep: /@browser-smoke/,
      grepInvert: /@real-api/,
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
