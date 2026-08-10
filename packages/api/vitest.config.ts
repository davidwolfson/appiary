import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["./test/**/*.spec.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "../../coverage/api",
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts",
        "src/**/*.d.ts",
      ],
      reportOnFailure: true,
      reporter: ["text-summary", "html", "lcov", "json-summary"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
