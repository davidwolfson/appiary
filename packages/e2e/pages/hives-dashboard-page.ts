import { expect, type Page } from "@playwright/test";

import type { AuthenticatedUser, CreateHiveInspectionRequest, CreateHiveRequest, UpdateHiveRequest } from "@appiary/types";

import { routes } from "../helpers/routes";

export function createHivesDashboardPage(page: Page) {
  const addHiveButton = page.getByRole("button", { name: "Add Hive" });
  const logoutButton = page.getByRole("button", { name: "Logout" });
  const emptyState = page.getByRole("heading", { name: "No hives yet" });
  const addHiveModal = page.getByRole("dialog", { name: "Add Hive" });
  const editHiveModal = page.getByRole("dialog", { name: "Edit Hive" });
  const hiveNameInput = page.getByLabel("Hive Name");
  const statusSelect = page.getByLabel("Status");
  const saveButton = page.getByRole("button", { name: "Save Hive" });
  const savingButton = page.getByRole("button", { name: "Saving..." });
  const cancelButton = page.getByRole("button", { name: "Cancel" });
  const alert = page.getByRole("alert");
  const loadingStatus = page.getByRole("status");
  const hiveCard = (hiveId: string) => page.getByTestId(`hive-card-${hiveId}`);
  const editHiveButton = (hiveId: string) => hiveCard(hiveId).getByRole("button", { name: "Edit Hive" });
  const addInspectionButton = (hiveId: string) => hiveCard(hiveId).getByRole("button", { name: "Add Inspection" });
  const inspectionModal = page.getByRole("dialog", { name: "Hive Inspection" });
  const inspectionDateInput = page.getByLabel("Date");
  const inspectionTimeInput = page.getByLabel("Time");
  const saveInspectionButton = page.getByRole("button", { name: "Save" });

  return {
    addHiveButton,
    logoutButton,
    emptyState,
    modal: addHiveModal,
    addHiveModal,
    editHiveModal,
    hiveCard,
    editHiveButton,
    addInspectionButton,
    inspectionModal,
    inspectionDateInput,
    saveInspectionButton,
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
    async expectHiveCard(hiveId: string, name: string, status: "Active" | "Inactive"): Promise<void> {
      const card = hiveCard(hiveId);
      await expect(card.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(card.getByText(status, { exact: true })).toBeVisible();
    },
    async openAddHiveModal(): Promise<void> {
      await addHiveButton.click();
      await expect(addHiveModal).toBeVisible();
    },
    async openEditHiveModal(hiveId: string): Promise<void> {
      await editHiveButton(hiveId).click();
      await expect(editHiveModal).toBeVisible();
    },
    async openAddInspectionModal(hiveId: string): Promise<void> {
      await addInspectionButton(hiveId).click();
      await expect(inspectionModal).toBeVisible();
    },
    async openInspection(hiveId: string, date: string): Promise<void> {
      await hiveCard(hiveId).getByRole("button", { name: date }).click();
      await expect(inspectionModal).toBeVisible();
    },
    async fillInspectionForm(payload: CreateHiveInspectionRequest): Promise<void> {
      await inspectionDateInput.fill(payload.inspectionDate);
      await inspectionTimeInput.fill(payload.inspectionTime);
      for (const [label, checked] of [["Queen Right", payload.queenRight], ["Eggs", payload.eggs], ["Larva", payload.larva], ["Capped Brood", payload.cappedBrood]] as const) {
        if (checked) await page.getByLabel(label, { exact: true }).check();
        else await page.getByLabel(label, { exact: true }).uncheck();
      }
      if (payload.broodPattern) {
        const label = payload.broodPattern === "na" ? "NA" : payload.broodPattern[0].toUpperCase() + payload.broodPattern.slice(1);
        await page.getByLabel(label, { exact: true }).check();
      }
      await page.getByLabel("Additional Notes").fill(payload.additionalNotes ?? "");
    },
    async fillForm(payload: CreateHiveRequest | UpdateHiveRequest): Promise<void> {
      await hiveNameInput.fill(payload.name);
      await statusSelect.selectOption({ label: payload.status ? "Active" : "Inactive" });
    },
    async submit(): Promise<void> {
      await saveButton.click();
    },
  };
}
