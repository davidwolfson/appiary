import { expect, type Page } from "@playwright/test";

import type { RegisterRequest } from "@appiary/types";

import { routes } from "../helpers/routes";

export function createRegisterPage(page: Page) {
  const heading = page.getByRole("heading", { name: "Create your apiary" });
  const accountNameInput = page.getByLabel("Account Name");
  const emailInput = page.getByLabel("Email");
  const passwordInput = page.getByLabel("Password", { exact: true });
  const confirmPasswordInput = page.getByLabel("Confirm Password");
  const submitButton = page.getByRole("button", { name: "Create account" });
  const loadingButton = page.getByRole("button", { name: "Creating account..." });
  const signInLink = page.getByRole("link", { name: "Sign in" });
  const alert = page.getByRole("alert");
  const passwordMismatchMessage = page.getByText("Passwords must match.");

  return {
    heading,
    accountNameInput,
    emailInput,
    passwordInput,
    confirmPasswordInput,
    submitButton,
    loadingButton,
    signInLink,
    alert,
    passwordMismatchMessage,
    async goto(): Promise<void> {
      await page.goto(routes.register);
    },
    async expectVisible(): Promise<void> {
      await expect(heading).toBeVisible();
      await expect(accountNameInput).toBeVisible();
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(confirmPasswordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
      await expect(signInLink).toBeVisible();
    },
    async fillForm(payload: RegisterRequest): Promise<void> {
      await accountNameInput.fill(payload.accountName);
      await emailInput.fill(payload.email);
      await passwordInput.fill(payload.password);
      await confirmPasswordInput.fill(payload.confirmPassword);
    },
    async submit(): Promise<void> {
      await submitButton.click();
    },
    async goToLogin(): Promise<void> {
      await signInLink.click();
    },
  };
}
