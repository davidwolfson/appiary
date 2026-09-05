import { expect, type Page } from "@playwright/test";

import type { AuthenticatedUser, CreateApiaryRequest, CreateHiveInspectionRequest, CreateHiveRequest, UpdateHiveRequest } from "@appiary/types";

import { routes } from "../helpers/routes";

export function createHivesDashboardPage(page: Page) {
  const hiveControls = page.getByRole("region", { name: "Hive controls" });
  const addHiveButton = hiveControls.getByRole("button", { name: "Add Hive" });
  const addApiaryButton = hiveControls.getByRole("button", { name: "Add Apiary" });
  const apiarySelect = hiveControls.getByLabel("Apiary", { exact: true });
  const logoutButton = page.getByRole("button", { name: "Logout" });
  const emptyApiariesState = page.getByRole("heading", { name: "No apiaries yet" });
  const emptyState = page.getByRole("heading", { name: "No hives yet" });
  const addHiveModal = page.getByRole("dialog", { name: "Add Hive" });
  const editHiveModal = page.getByRole("dialog", { name: "Edit Hive" });
  const addApiaryModal = page.getByRole("dialog", { name: "Add Apiary" });
  const apiaryNameInput = addApiaryModal.getByLabel("Apiary Name");
  const saveApiaryButton = addApiaryModal.getByRole("button", { name: "Save Apiary" });
  const savingApiaryButton = addApiaryModal.getByRole("button", { name: "Saving Apiary..." });
  const cancelApiaryButton = addApiaryModal.getByRole("button", { name: "Cancel Add Apiary" });
  const closeApiaryButton = addApiaryModal.getByRole("button", { name: "Close Add Apiary" });
  const hiveNameInput = page.getByLabel("Hive Name");
  const statusSelect = page.getByLabel("Status", { exact: true });
  const hiveApiarySelect = page.getByRole("dialog").getByLabel("Apiary", { exact: true });
  const hiveStatusFilter = hiveControls.getByLabel("Hive Status", { exact: true });
  const saveButton = page.getByRole("button", { name: "Save Hive" });
  const savingButton = page.getByRole("button", { name: "Saving..." });
  const cancelButton = page.getByRole("button", { name: "Cancel" });
  const alert = page.getByRole("alert");
  const apiariesLoadingStatus = page.getByRole("status").filter({ hasText: "Loading apiaries..." });
  const retryApiariesButton = page.getByRole("button", { name: "Retry Apiaries" });
  const loadingStatus = page.getByRole("status").filter({ hasText: "Loading hives..." });
  const hiveCard = (hiveId: string) => page.getByTestId(`hive-card-${hiveId}`);
  const editHiveButton = (hiveId: string) => hiveCard(hiveId).getByRole("button", { name: "Edit Hive" });
  const addInspectionButton = (hiveId: string) => hiveCard(hiveId).getByRole("button", { name: "Add Inspection" });
  const inspectionModal = page.getByRole("dialog", { name: "Hive Inspection" });
  const inspectionDateInput = inspectionModal.getByLabel("Date");
  const inspectionTimeInput = inspectionModal.getByLabel("Time");
  const queenRightCheckbox = inspectionModal.getByLabel("Queen Right", { exact: true });
  const eggsCheckbox = inspectionModal.getByLabel("Eggs", { exact: true });
  const larvaCheckbox = inspectionModal.getByLabel("Larva", { exact: true });
  const cappedBroodCheckbox = inspectionModal.getByLabel("Capped Brood", { exact: true });
  const broodPatternRadio = (label: "Good" | "Fair" | "Poor" | "NA") =>
    inspectionModal.getByLabel(label, { exact: true });
  const additionalNotesInput = inspectionModal.getByLabel("Additional Notes");
  const saveInspectionButton = inspectionModal.getByRole("button", { name: "Save", exact: true });
  const cancelInspectionButton = inspectionModal.getByRole("button", { name: "Cancel" });
  const closeInspectionButton = inspectionModal.getByRole("button", { name: "Close" });
  const formatInspectionDate = (date: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    return match ? `${Number(match[2])}/${Number(match[3])}/${match[1]}` : date;
  };
  const inspectionRow = (hiveId: string, date: string) =>
    hiveCard(hiveId).getByRole("row", { name: `View inspection from ${formatInspectionDate(date)}`, exact: true });
  const previousInspectionsButton = (hiveId: string) =>
    hiveCard(hiveId).getByRole("button", { name: "Previous inspections" });
  const nextInspectionsButton = (hiveId: string) =>
    hiveCard(hiveId).getByRole("button", { name: "Next inspections" });
  const inspectionPaginationAlert = (hiveId: string) =>
    hiveCard(hiveId).getByRole("alert");
  const retryInspectionsButton = (hiveId: string) =>
    hiveCard(hiveId).getByRole("button", { name: "Retry inspections" });

  return {
    hiveControls,
    addHiveButton,
    addApiaryButton,
    apiarySelect,
    logoutButton,
    emptyApiariesState,
    emptyState,
    modal: addHiveModal,
    addHiveModal,
    editHiveModal,
    addApiaryModal,
    apiaryNameInput,
    saveApiaryButton,
    savingApiaryButton,
    cancelApiaryButton,
    closeApiaryButton,
    hiveCard,
    editHiveButton,
    addInspectionButton,
    inspectionModal,
    inspectionDateInput,
    inspectionTimeInput,
    queenRightCheckbox,
    eggsCheckbox,
    larvaCheckbox,
    cappedBroodCheckbox,
    broodPatternRadio,
    additionalNotesInput,
    saveInspectionButton,
    cancelInspectionButton,
    closeInspectionButton,
    inspectionRow,
    previousInspectionsButton,
    nextInspectionsButton,
    inspectionPaginationAlert,
    retryInspectionsButton,
    hiveNameInput,
    statusSelect,
    hiveApiarySelect,
    hiveStatusFilter,
    saveButton,
    savingButton,
    cancelButton,
    alert,
    apiariesLoadingStatus,
    retryApiariesButton,
    loadingStatus,
    async goto(): Promise<void> {
      if (new URL(page.url()).pathname !== routes.home) {
        await page.goto(routes.home);
      }
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
      await expect(card.getByRole("img", { name: status, exact: true })).toHaveAttribute("title", status);
    },
    async selectHiveFilter(filter: "Active" | "All" | "Inactive"): Promise<void> {
      await hiveStatusFilter.selectOption({ label: filter });
    },
    async selectApiary(apiaryId: string): Promise<void> {
      await apiarySelect.selectOption(apiaryId);
    },
    async openAddApiaryModal(): Promise<void> {
      await addApiaryButton.click();
      await expect(addApiaryModal).toBeVisible();
    },
    async fillApiaryForm(payload: CreateApiaryRequest): Promise<void> {
      await apiaryNameInput.fill(payload.name);
    },
    async submitApiary(): Promise<void> {
      await saveApiaryButton.click();
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
      await inspectionRow(hiveId, date).click();
      await expect(inspectionModal).toBeVisible();
    },
    async showPreviousInspections(hiveId: string): Promise<void> {
      await previousInspectionsButton(hiveId).click();
    },
    async showNextInspections(hiveId: string): Promise<void> {
      await nextInspectionsButton(hiveId).click();
    },
    async fillInspectionForm(payload: CreateHiveInspectionRequest): Promise<void> {
      await inspectionDateInput.fill(payload.inspectionDate);
      await inspectionTimeInput.fill(payload.inspectionTime);
      for (const [control, checked] of [[queenRightCheckbox, payload.queenRight], [eggsCheckbox, payload.eggs], [larvaCheckbox, payload.larva], [cappedBroodCheckbox, payload.cappedBrood]] as const) {
        if (checked) await control.check();
        else await control.uncheck();
      }
      if (payload.broodPattern) {
        const label = payload.broodPattern === "na" ? "NA" : payload.broodPattern[0].toUpperCase() + payload.broodPattern.slice(1);
        await broodPatternRadio(label as "Good" | "Fair" | "Poor" | "NA").check();
      }
      await additionalNotesInput.fill(payload.additionalNotes ?? "");
    },
    async fillForm(payload: CreateHiveRequest | UpdateHiveRequest): Promise<void> {
      await hiveApiarySelect.selectOption(payload.apiaryId);
      await hiveNameInput.fill(payload.name);
      await statusSelect.selectOption({ label: payload.status ? "Active" : "Inactive" });
    },
    async submit(): Promise<void> {
      await saveButton.click();
    },
  };
}
