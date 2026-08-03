import { expect, test } from "@playwright/test";

import { createAuthenticatedUser, visitAsAuthenticatedUser } from "../../helpers/auth";
import {
  createHive,
  createHiveInput,
  createInspection,
  createInspectionInput,
  mockCreateHiveRequest,
  mockCreateInspectionRequest,
  mockListHivesRequest,
  mockUpdateHiveRequest,
} from "../../helpers/hives";
import { expectNoRequests } from "../../helpers/requests";
import { routes } from "../../helpers/routes";
import { createHivesDashboardPage } from "../../pages/hives-dashboard-page";

test.describe("hives dashboard", () => {
  test("renders the dashboard for authenticated users", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated and have no hives
    await visitAsAuthenticatedUser(page, user);

    // when I navigate to the dashboard
    await dashboardPage.goto();

    // then I should see the Hives Dashboard
    await dashboardPage.expectSignedIn(user);
  });

  test("redirects unauthenticated users away from the dashboard", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);

    // given I am not authenticated

    // when I navigate to the dashboard
    await dashboardPage.goto();

    // then I should be redirected to login
    await expect(page).toHaveURL(new RegExp(`${routes.login}$`));
  });

  test("shows the empty state when the account has no hives", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated and the API returns no hives
    await visitAsAuthenticatedUser(page, user);

    // when I navigate to the dashboard
    await dashboardPage.goto();

    // then I should see the empty dashboard state
    await expect(dashboardPage.emptyState).toBeVisible();
  });

  test("shows only active hive cards by default", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated and the API returns hives
    await visitAsAuthenticatedUser(page, user);
    await mockListHivesRequest(page, [
      createHive({ hiveId: "hive-1", name: "North Field", status: true }),
      createHive({ hiveId: "hive-2", name: "South Field", status: false }),
    ]);

    // when I navigate to the dashboard
    await dashboardPage.goto();

    // then Active should be selected and only the active hive should be rendered
    await expect(dashboardPage.hiveStatusFilter).toHaveValue("active");
    await dashboardPage.expectHiveCard("hive-1", "North Field", "Active");
    await expect(dashboardPage.hiveCard("hive-2")).toHaveCount(0);
  });

  test("shows every hive card when All is selected", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated and the API returns active and inactive hives
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [
      createHive({ hiveId: "hive-1", name: "North Field", status: true }),
      createHive({ hiveId: "hive-2", name: "South Field", status: false }),
    ]);
    await dashboardPage.goto();

    // when I select All
    await dashboardPage.selectHiveFilter("All");

    // then both hives should be rendered
    await dashboardPage.expectHiveCard("hive-1", "North Field", "Active");
    await dashboardPage.expectHiveCard("hive-2", "South Field", "Inactive");
  });

  test("shows only inactive hive cards when Inactive is selected", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated and the API returns active and inactive hives
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [
      createHive({ hiveId: "hive-1", name: "North Field", status: true }),
      createHive({ hiveId: "hive-2", name: "South Field", status: false }),
    ]);
    await dashboardPage.goto();

    // when I select Inactive
    await dashboardPage.selectHiveFilter("Inactive");

    // then only the inactive hive should be rendered
    await expect(dashboardPage.hiveCard("hive-1")).toHaveCount(0);
    await dashboardPage.expectHiveCard("hive-2", "South Field", "Inactive");
  });

  test("shows a loading state while hives are loading", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);
    let resolveRequest!: () => void;
    const requestReleased = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    // given I am authenticated and the hives API is still loading
    await visitAsAuthenticatedUser(page, user);
    await mockListHivesRequest(page, async (route) => {
      await requestReleased;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ hives: [] }),
      });
    });

    try {
      // when I navigate to the dashboard
      await dashboardPage.goto();

      // then I should see a loading status
      await expect(dashboardPage.loadingStatus).toHaveText("Loading hives...");
    } finally {
      resolveRequest();
    }
  });

  test("shows an error when the hives API fails", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated and the hives API fails
    await visitAsAuthenticatedUser(page, user);
    await mockListHivesRequest(page, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Could not load hives" }),
      });
    });

    // when I navigate to the dashboard
    await dashboardPage.goto();

    // then I should see the load error
    await expect(dashboardPage.alert).toHaveText("Could not load hives");
  });

  test("opens the Add Hive modal from the labeled dashboard controls", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);

    // given I am on the Hives Dashboard
    await visitAsAuthenticatedUser(page, user);
    await dashboardPage.goto();

    // when I view the grouped controls and click the visibly labeled Add Hive button
    await expect(dashboardPage.hiveControls).toBeVisible();
    await expect(dashboardPage.hiveStatusFilter).toBeVisible();
    await expect(dashboardPage.addHiveButton).toContainText("Add Hive");
    await dashboardPage.openAddHiveModal();

    // then I should see the Add Hive modal
    await expect(dashboardPage.modal).toBeVisible();
  });

  test("does not submit invalid Add Hive input", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);
    const { requests } = await mockCreateHiveRequest(page, async (route) => {
      await route.abort();
    });

    // given I am on the Add Hive modal
    await visitAsAuthenticatedUser(page, user);
    await dashboardPage.goto();
    await dashboardPage.openAddHiveModal();

    // when I submit with an empty name
    await dashboardPage.submit();

    // then validation should be visible, the modal should remain open, and no create request should be sent
    await expect(page.getByText("Hive name is required.")).toBeVisible();
    await expect(dashboardPage.addHiveModal).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expectNoRequests(requests);
  });

  test("creates a hive and appends it to the dashboard", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);
    const input = createHiveInput({ name: "South Field", status: false });
    const { requests } = await mockCreateHiveRequest(page, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          hive: createHive({ hiveId: "hive-2", name: "South Field", status: false }),
        }),
      });
    });

    // given I am on the Add Hive modal
    await visitAsAuthenticatedUser(page, user);
    await dashboardPage.goto();
    await dashboardPage.openAddHiveModal();

    // when I submit valid hive details and select Inactive
    await dashboardPage.fillForm(input);
    await dashboardPage.submit();
    await dashboardPage.selectHiveFilter("Inactive");

    // then the request should be exact, the modal should close, and the created hive should appear
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual(input);
    await expect(dashboardPage.modal).toBeHidden();
    await dashboardPage.expectHiveCard("hive-2", "South Field", "Inactive");
  });

  test("shows saving state while create is pending", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);
    let resolveRequest!: () => void;
    const requestReleased = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    await mockCreateHiveRequest(page, async (route) => {
      await requestReleased;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ hive: createHive() }),
      });
    });

    // given I am on the Add Hive modal
    await visitAsAuthenticatedUser(page, user);
    await dashboardPage.goto();
    await dashboardPage.openAddHiveModal();

    try {
      // when I submit valid hive details and the request is pending
      await dashboardPage.fillForm(createHiveInput());
      await dashboardPage.submit();

      // then the submit button should show a saving state
      await expect(dashboardPage.savingButton).toBeDisabled();
    } finally {
      resolveRequest();
    }
  });

  test("keeps the modal open and shows API errors", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);

    await mockCreateHiveRequest(page, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "Hive name already exists" }),
      });
    });

    // given I am on the Add Hive modal
    await visitAsAuthenticatedUser(page, user);
    await dashboardPage.goto();
    await dashboardPage.openAddHiveModal();

    // when the create request fails
    await dashboardPage.fillForm(createHiveInput());
    await dashboardPage.submit();

    // then the modal should remain open with the API error
    await expect(dashboardPage.modal).toBeVisible();
    await expect(dashboardPage.alert).toHaveText("Hive name already exists");
  });

  test("opens the Edit Hive modal populated from a hive card", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated and have an inactive hive
    await visitAsAuthenticatedUser(page, user);
    await mockListHivesRequest(page, [
      createHive({ hiveId: "hive-1", name: "North Field", status: false }),
    ]);
    await dashboardPage.goto();
    await dashboardPage.selectHiveFilter("Inactive");

    // when I click the hive card edit button
    await expect(dashboardPage.editHiveButton("hive-1")).toHaveAttribute("title", "Edit Hive");
    await dashboardPage.openEditHiveModal("hive-1");

    // then I should see the Edit Hive modal populated with that hive
    await expect(dashboardPage.editHiveModal).toBeVisible();
    await expect(dashboardPage.hiveNameInput).toHaveValue("North Field");
    await expect(dashboardPage.statusSelect).toHaveValue(/false$/);
  });

  test("updates the targeted hive without changing other cards", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);
    const input = createHiveInput({ name: "South Field", status: false });
    const { requests } = await mockUpdateHiveRequest(page, async (route, hiveId, payload) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ hive: createHive({ hiveId, ...payload }) }),
      });
    });

    // given I am authenticated and have opened one of multiple hives for editing
    await visitAsAuthenticatedUser(page, user);
    await mockListHivesRequest(page, [
      createHive({ hiveId: "hive-1", name: "North Field", status: true }),
      createHive({ hiveId: "hive-2", name: "West Field", status: true }),
    ]);
    await dashboardPage.goto();
    await dashboardPage.openEditHiveModal("hive-1");

    // when I submit valid updated hive details and select All
    await dashboardPage.fillForm(input);
    await dashboardPage.submit();
    await dashboardPage.selectHiveFilter("All");

    // then the update request should be exact and both cards should show their current values
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual({ hiveId: "hive-1", payload: input });
    await expect(dashboardPage.editHiveModal).toBeHidden();
    await dashboardPage.expectHiveCard("hive-1", "South Field", "Inactive");
    await dashboardPage.expectHiveCard("hive-2", "West Field", "Active");
  });

  test("keeps the Edit Hive modal open when the update API fails", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);
    await mockUpdateHiveRequest(page, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "Hive name already exists" }),
      });
    });

    // given I am authenticated and have opened an existing hive for editing
    await visitAsAuthenticatedUser(page, user);
    await mockListHivesRequest(page, [createHive()]);
    await dashboardPage.goto();
    await dashboardPage.openEditHiveModal("hive-123");

    // when the update request fails
    await dashboardPage.fillForm(createHiveInput({ name: "Existing Hive" }));
    await dashboardPage.submit();

    // then the Edit Hive modal should remain open with the API error
    await expect(dashboardPage.editHiveModal).toBeVisible();
    await expect(dashboardPage.alert).toHaveText("Hive name already exists");
  });

  test("does not submit invalid Edit Hive input", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);
    const { requests } = await mockUpdateHiveRequest(page, async (route) => {
      await route.abort();
    });

    // given I am authenticated and have opened an existing hive for editing
    await visitAsAuthenticatedUser(page, user);
    await mockListHivesRequest(page, [createHive()]);
    await dashboardPage.goto();
    await dashboardPage.openEditHiveModal("hive-123");

    // when I clear the hive name and submit
    await dashboardPage.hiveNameInput.fill("");
    await dashboardPage.submit();

    // then no update request should be sent and validation should be visible
    await expect(page.getByText("Hive name is required.")).toBeVisible();
    await expect(dashboardPage.editHiveModal).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expectNoRequests(requests);
  });

  test("opens Add Inspection with local defaults and every form control", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated with a named hive
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [createHive({ name: "North Orchard" })]);
    await dashboardPage.goto();
    const beforeOpen = await page.evaluate(() => {
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      return {
        date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      };
    });

    // when I open Add Inspection
    await expect(dashboardPage.addInspectionButton("hive-123")).toHaveAttribute("title", "Add Inspection");
    await dashboardPage.openAddInspectionModal("hive-123");
    const afterOpen = await page.evaluate(() => {
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      return {
        date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      };
    });

    // then the modal identifies the hive and initializes the complete form
    await expect(dashboardPage.inspectionModal.getByText("North Orchard", { exact: true })).toBeVisible();
    expect([beforeOpen.date, afterOpen.date]).toContain(await dashboardPage.inspectionDateInput.inputValue());
    expect([beforeOpen.time, afterOpen.time]).toContain(await dashboardPage.inspectionTimeInput.inputValue());
    for (const checkbox of [dashboardPage.queenRightCheckbox, dashboardPage.eggsCheckbox, dashboardPage.larvaCheckbox, dashboardPage.cappedBroodCheckbox]) {
      await expect(checkbox).toBeVisible();
      await expect(checkbox).not.toBeChecked();
    }
    for (const label of ["Good", "Fair", "Poor", "NA"] as const) {
      await expect(dashboardPage.broodPatternRadio(label)).toBeVisible();
      await expect(dashboardPage.broodPatternRadio(label)).not.toBeChecked();
    }
    await expect(dashboardPage.additionalNotesInput).toBeVisible();
    await expect(dashboardPage.saveInspectionButton).toBeVisible();
    await expect(dashboardPage.cancelInspectionButton).toBeVisible();
    await expect(dashboardPage.closeInspectionButton).toBeVisible();
  });

  test("creates an inspection with the nested API payload and adds it to history", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);
    const input = createInspectionInput();
    const existingInspections = Array.from({ length: 5 }, (_, index) => createInspection({
      inspectionId: `existing-inspection-${index}`,
      inspectionDate: `2026-07-${String(30 - index).padStart(2, "0")}`,
    }));
    const { requests } = await mockCreateInspectionRequest(page, async (route, hiveId, payload) => {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ inspection: createInspection({ hiveId, ...payload }) }) });
    });

    // given I am authenticated with a hive and have opened Add Inspection
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [
      createHive({ inspections: existingInspections }),
      createHive({ hiveId: "hive-456", name: "South Field" }),
    ]);
    await dashboardPage.goto();
    await dashboardPage.openAddInspectionModal("hive-123");

    // when I enter inspection details and save
    await dashboardPage.fillInspectionForm(input);
    await dashboardPage.saveInspectionButton.click();

    // then the nested request is exact, the newest page is shown, and older history remains reachable
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual({ hiveId: "hive-123", payload: input });
    await expect(dashboardPage.inspectionModal).toBeHidden();
    await expect(dashboardPage.inspectionDateButton("hive-123", input.inspectionDate)).toBeVisible();
    await expect(dashboardPage.previousInspectionsButton("hive-123")).toBeDisabled();
    await dashboardPage.showNextInspections("hive-123");
    await expect(dashboardPage.inspectionDateButton("hive-123", "2026-07-26")).toBeVisible();
    await expect(dashboardPage.hiveCard("hive-456").getByRole("table")).toHaveCount(0);
  });

  test("does not submit an inspection without its required date and time", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);
    const { requests } = await mockCreateInspectionRequest(page, async (route) => {
      await route.abort();
    });

    // given I have opened Add Inspection for a hive
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [createHive()]);
    await dashboardPage.goto();
    await dashboardPage.openAddInspectionModal("hive-123");

    // when I clear the required date and time and save
    await dashboardPage.inspectionDateInput.fill("");
    await dashboardPage.inspectionTimeInput.fill("");
    await dashboardPage.saveInspectionButton.click();

    // then validation is visible without sending a request or leaving the modal
    await expect(dashboardPage.inspectionModal.getByText("Inspection date is required.")).toBeVisible();
    await expect(dashboardPage.inspectionModal.getByText("Inspection time is required.")).toBeVisible();
    await expect(dashboardPage.inspectionModal).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expectNoRequests(requests);
  });

  test("prevents duplicate inspection submission while saving", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const { requests } = await mockCreateInspectionRequest(page, async (route) => {
      await pending;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ inspection: createInspection() }) });
    });

    // given a valid inspection is ready to save
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [createHive()]);
    await dashboardPage.goto();
    await dashboardPage.openAddInspectionModal("hive-123");
    await dashboardPage.fillInspectionForm(createInspectionInput());

    try {
      // when I save while the API request remains pending
      await dashboardPage.saveInspectionButton.click();

      // then saving is disabled and only one request is sent
      await expect(page.getByRole("button", { name: "Saving..." })).toBeDisabled();
      await page.getByRole("button", { name: "Saving..." }).click({ force: true });
      await expect.poll(() => requests.length).toBe(1);
    } finally { release(); }
  });

  test("keeps Add Inspection open and displays API failures", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);
    await mockCreateInspectionRequest(page, async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Could not save inspection" }) });
    });

    // given I have opened Add Inspection for a hive
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [createHive()]);
    await dashboardPage.goto();
    await dashboardPage.openAddInspectionModal("hive-123");

    // when the inspection request fails
    await dashboardPage.fillInspectionForm(createInspectionInput());
    await dashboardPage.saveInspectionButton.click();

    // then the modal remains open with the API message
    await expect(dashboardPage.inspectionModal).toBeVisible();
    await expect(dashboardPage.alert).toHaveText("Could not save inspection");
    await expect(dashboardPage.inspectionDateInput).toHaveValue("2026-07-31");
    await expect(dashboardPage.inspectionTimeInput).toHaveValue("10:30");
    await expect(dashboardPage.queenRightCheckbox).toBeChecked();
    await expect(dashboardPage.eggsCheckbox).toBeChecked();
    await expect(dashboardPage.larvaCheckbox).not.toBeChecked();
    await expect(dashboardPage.cappedBroodCheckbox).toBeChecked();
    await expect(dashboardPage.broodPatternRadio("Fair")).toBeChecked();
    await expect(dashboardPage.additionalNotesInput).toHaveValue("Add feed");
  });

  test("paginates inspection histories independently within each hive", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);
    const inspections = Array.from({ length: 6 }, (_, index) => createInspection({ inspectionId: `inspection-${index}`, inspectionDate: `2026-07-${String(30 - index).padStart(2, "0")}` }));
    const otherInspections = Array.from({ length: 6 }, (_, index) => createInspection({ hiveId: "hive-other", inspectionId: `other-inspection-${index}`, inspectionDate: `2026-06-${String(30 - index).padStart(2, "0")}` }));

    // given two hives have six inspections and another has none
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [
      createHive({ inspections }),
      createHive({ hiveId: "hive-other", name: "Other", inspections: otherInspections }),
      createHive({ hiveId: "hive-empty", name: "Empty", inspections: [] }),
    ]);

    // when I open the dashboard and advance only the first hive
    await dashboardPage.goto();
    await expect(dashboardPage.previousInspectionsButton("hive-123")).toBeDisabled();
    await expect(dashboardPage.nextInspectionsButton("hive-123")).toBeEnabled();
    await dashboardPage.showNextInspections("hive-123");

    // then its older entry and boundary state appear without changing the other hive
    await expect(dashboardPage.inspectionDateButton("hive-123", "2026-07-25")).toBeVisible();
    await expect(dashboardPage.previousInspectionsButton("hive-123")).toBeEnabled();
    await expect(dashboardPage.nextInspectionsButton("hive-123")).toBeDisabled();
    await expect(dashboardPage.inspectionDateButton("hive-other", "2026-06-30")).toBeVisible();
    await expect(dashboardPage.inspectionDateButton("hive-other", "2026-06-25")).toHaveCount(0);
    await expect(dashboardPage.hiveCard("hive-empty").getByRole("table")).toHaveCount(0);
    await expect(dashboardPage.previousInspectionsButton("hive-empty")).toHaveCount(0);

    // when I return to the first page
    await dashboardPage.showPreviousInspections("hive-123");

    // then the newest five and initial boundary state return
    await expect(dashboardPage.hiveCard("hive-123").getByRole("button", { name: /^2026-07-/ })).toHaveCount(5);
    await expect(dashboardPage.inspectionDateButton("hive-123", "2026-07-25")).toHaveCount(0);
    await expect(dashboardPage.previousInspectionsButton("hive-123")).toBeDisabled();
  });

  test("opens history read-only and restores focus to its date trigger", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);
    const inspection = createInspection();

    // given an inspection date is visible in hive history
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [createHive({ inspections: [inspection] })]);
    await dashboardPage.goto();
    const dateTrigger = dashboardPage.hiveCard("hive-123").getByRole("button", { name: inspection.inspectionDate });

    // when I open the historical inspection
    await dashboardPage.openInspection("hive-123", inspection.inspectionDate);

    // then every value is populated read-only and create actions are absent
    await expect(dashboardPage.inspectionModal.getByText("North Field", { exact: true })).toBeVisible();
    await expect(dashboardPage.inspectionDateInput).toBeDisabled();
    await expect(dashboardPage.inspectionDateInput).toHaveValue(inspection.inspectionDate);
    await expect(dashboardPage.inspectionTimeInput).toBeDisabled();
    await expect(dashboardPage.inspectionTimeInput).toHaveValue(inspection.inspectionTime);
    for (const checkbox of [dashboardPage.queenRightCheckbox, dashboardPage.eggsCheckbox, dashboardPage.larvaCheckbox]) {
      await expect(checkbox).toBeDisabled();
      await expect(checkbox).toBeChecked();
    }
    await expect(dashboardPage.cappedBroodCheckbox).toBeDisabled();
    await expect(dashboardPage.cappedBroodCheckbox).not.toBeChecked();
    for (const label of ["Good", "Fair", "Poor", "NA"] as const) await expect(dashboardPage.broodPatternRadio(label)).toBeDisabled();
    await expect(dashboardPage.broodPatternRadio("Good")).toBeChecked();
    await expect(dashboardPage.additionalNotesInput).toBeDisabled();
    await expect(dashboardPage.additionalNotesInput).toHaveValue("Healthy colony");
    await expect(dashboardPage.saveInspectionButton).toHaveCount(0);
    await expect(dashboardPage.cancelInspectionButton).toHaveCount(0);
    await expect(dashboardPage.closeInspectionButton).toBeFocused();
    await dashboardPage.closeInspectionButton.click();
    await expect(dashboardPage.inspectionModal).toBeHidden();
    await expect(dateTrigger).toBeFocused();
  });
});
