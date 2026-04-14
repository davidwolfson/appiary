import { expect, type Page } from "@playwright/test";

import type { LoginRequest } from "@appiary/types";

import { routes } from "../helpers/routes";

export function createLoginPage(page: Page) {
  const heading = page.getByRole("heading", { name: "Welcome back" });
  const emailInput = page.getByLabel("Email");
  const passwordInput = page.getByLabel("Password");
  const submitButton = page.getByRole("button", { name: "Sign in" });
  const loadingButton = page.getByRole("button", { name: "Signing in..." });
  const registerLink = page.getByRole("link", { name: "Register" });
  const alert = page.getByRole("alert");

  return {
    heading,
    emailInput,
    passwordInput,
    submitButton,
    loadingButton,
    registerLink,
    alert,
    async goto(): Promise<void> {
      await page.goto(routes.login);
    },
    async expectVisible(): Promise<void> {
      await expect(heading).toBeVisible();
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
      await expect(registerLink).toBeVisible();
    },
    async fillForm(payload: LoginRequest): Promise<void> {
      await emailInput.fill(payload.email);
      await passwordInput.fill(payload.password);
    },
    async submit(): Promise<void> {
      await submitButton.click();
    },
    async goToRegister(): Promise<void> {
      await registerLink.click();
    },
  };
}
