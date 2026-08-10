import eslint from "@eslint/js";
import angular from "angular-eslint";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      ".angular/**",
      "coverage/**",
      "test-results/**",
      "packages/e2e/playwright-report/**",
      "packages/e2e/test-results/**",
    ],
  },
  {
    files: ["packages/**/*.ts"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["packages/web/**/*.ts"],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
  },
  {
    files: ["packages/web/**/*.html"],
    extends: [...angular.configs.templateRecommended],
  },
);
