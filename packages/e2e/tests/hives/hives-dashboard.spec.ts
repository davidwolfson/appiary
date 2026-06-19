import { expect, test } from "@playwright/test";

import { createAuthenticatedUser, visitAsAuthenticatedUser } from "../../helpers/auth";
import { createHive, createHiveInput, mockCreateHiveRequest, mockListHivesRequest } from "../../helpers/hives";
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
    await dashboardPage.expectHiveCard("North Field", "Active");
    await dashboardPage.expectHiveCard("South Field", "Inactive");
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

    // when I navigate to the dashboard
    await dashboardPage.goto();

    // then I should see a loading status
    await expect(dashboardPage.loadingStatus).toHaveText("Loading hives...");

    resolveRequest();
    await expect(dashboardPage.emptyState).toBeVisible();
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

    // then no create request should be sent
    expect(requests).toHaveLength(0);
    await expect(page.getByText("Hive name is required.")).toBeVisible();
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
    await dashboardPage.expectHiveCard("South Field", "Inactive");
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

    // when I submit valid hive details and the request is pending
    await dashboardPage.fillForm(createHiveInput());
    await dashboardPage.submit();

    // then the submit button should show a saving state
    await expect(dashboardPage.savingButton).toBeDisabled();

    resolveRequest();
    await expect(dashboardPage.modal).toBeHidden();
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
});
