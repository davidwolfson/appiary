import { expect, type Page } from "@playwright/test";

import type { AuthenticatedUser, CreateHiveRequest } from "@appiary/types";

import { routes } from "../helpers/routes";

export function createHivesDashboardPage(page: Page) {
  const addHiveButton = page.getByRole("button", { name: "Add Hive" });
  const logoutButton = page.getByRole("button", { name: "Logout" });
  const emptyState = page.getByRole("heading", { name: "No hives yet" });
  const modal = page.getByRole("dialog", { name: "Add Hive" });
  const hiveNameInput = page.getByLabel("Hive Name");
  const statusSelect = page.getByLabel("Status");
  const saveButton = page.getByRole("button", { name: "Save Hive" });
  const savingButton = page.getByRole("button", { name: "Saving..." });
  const cancelButton = page.getByRole("button", { name: "Cancel" });
  const alert = page.getByRole("alert");
  const loadingStatus = page.getByRole("status");

  return {
    addHiveButton,
    logoutButton,
    emptyState,
    modal,
    hiveNameInput,
    statusSelect,
    saveButton,
    savingButton,
    cancelButton,
    alert,
    loadingStatus,
    async goto(): Promise<void> {
      await page.goto(routes.home);
    },
    async expectSignedIn(user: AuthenticatedUser): Promise<void> {
      await expect(page.getByRole("heading", { name: `${user.accountName} Hives` })).toBeVisible();
      await expect(page.getByText(user.email)).toBeVisible();
      await expect(addHiveButton).toBeVisible();
      await expect(logoutButton).toBeVisible();
    },
    async expectHiveCard(name: string, status: "Active" | "Inactive"): Promise<void> {
      await expect(page.getByRole("heading", { name })).toBeVisible();
      await expect(page.getByText(status, { exact: true })).toBeVisible();
    },
    async openAddHiveModal(): Promise<void> {
      await addHiveButton.click();
      await expect(modal).toBeVisible();
    },
    async fillForm(payload: CreateHiveRequest): Promise<void> {
      await hiveNameInput.fill(payload.name);
      await statusSelect.selectOption({ label: payload.status ? "Active" : "Inactive" });
    },
    async submit(): Promise<void> {
      await saveButton.click();
    },
  };
}
