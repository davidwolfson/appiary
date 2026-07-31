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

  test("renders hive cards returned by the hives API", async ({ page }) => {
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

    // then each hive should be rendered as a card
    await dashboardPage.expectHiveCard("hive-1", "North Field", "Active");
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

  test("opens the Add Hive modal from an accessible icon button", async ({ page }) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);

    // given I am on the Hives Dashboard
    await visitAsAuthenticatedUser(page, user);
    await dashboardPage.goto();

    // when I click the Add Hive button
    await expect(dashboardPage.addHiveButton).toHaveAttribute("title", "Add Hive");
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

    // when I submit valid hive details
    await dashboardPage.fillForm(input);
    await dashboardPage.submit();

    // then the request should contain the hive name and status
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual(input);

    // then the modal should close and the created hive should appear
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

    // when I submit valid updated hive details
    await dashboardPage.fillForm(input);
    await dashboardPage.submit();

    // then the update request should target the selected hive with the edited payload
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual({ hiveId: "hive-1", payload: input });

    // then the modal should close, the targeted card should update, and the other card should remain unchanged
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

  test("creates an inspection with the nested API payload and adds it to history", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);
    const input = createInspectionInput();
    const { requests } = await mockCreateInspectionRequest(page, async (route, hiveId, payload) => {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ inspection: createInspection({ hiveId, ...payload }) }) });
    });

    // given I am authenticated with a hive and have opened Add Inspection
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [createHive()]);
    await dashboardPage.goto();
    await dashboardPage.openAddInspectionModal("hive-123");

    // when I enter inspection details and save
    await dashboardPage.fillInspectionForm(input);
    await dashboardPage.saveInspectionButton.click();

    // then the nested request should be exact and the new date should appear in history
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual({ hiveId: "hive-123", payload: input });
    await expect(dashboardPage.inspectionModal).toBeHidden();
    await expect(dashboardPage.hiveCard("hive-123").getByRole("button", { name: input.inspectionDate })).toBeVisible();
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
  });

  test("shows only the latest five inspection history entries", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);
    const inspections = Array.from({ length: 6 }, (_, index) => createInspection({ inspectionId: `inspection-${index}`, inspectionDate: `2026-07-${String(30 - index).padStart(2, "0")}` }));

    // given a hive has six inspections and another has none
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [createHive({ inspections }), createHive({ hiveId: "hive-empty", name: "Empty", inspections: [] })]);

    // when I open the dashboard
    await dashboardPage.goto();

    // then only five dates render and the empty hive has no history table
    await expect(dashboardPage.hiveCard("hive-123").getByRole("button", { name: /^2026-07-/ })).toHaveCount(5);
    await expect(dashboardPage.hiveCard("hive-123").getByRole("button", { name: "2026-07-25" })).toHaveCount(0);
    await expect(dashboardPage.hiveCard("hive-empty").getByRole("table")).toHaveCount(0);
  });

  test("opens history read-only and restores focus to its date trigger", async ({ page }) => {
    const dashboardPage = createHivesDashboardPage(page);
    const inspection = createInspection();

    // given an inspection date is visible in hive history
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());
    await mockListHivesRequest(page, [createHive({ inspections: [inspection] })]);
    await dashboardPage.goto();
    const dateTrigger = dashboardPage.hiveCard("hive-123").getByRole("button", { name: inspection.inspectionDate });

    // when I open and close the historical inspection
    await dashboardPage.openInspection("hive-123", inspection.inspectionDate);
    await expect(dashboardPage.inspectionDateInput).toBeDisabled();
    await expect(dashboardPage.inspectionModal.getByRole("button", { name: "Close" })).toBeFocused();
    await dashboardPage.inspectionModal.getByRole("button", { name: "Close" }).click();

    // then focus returns to the history date that opened it
    await expect(dashboardPage.inspectionModal).toBeHidden();
    await expect(dateTrigger).toBeFocused();
  });
});
