import { test } from "@playwright/test";

import { expectAccessiblePage } from "../../helpers/accessibility";
import { createAuthenticatedUser, visitAsAuthenticatedUser } from "../../helpers/auth";
import { createHive, createInspection } from "../../helpers/hives";
import { createHivesDashboardPage } from "../../pages/hives-dashboard-page";
import { createLoginPage } from "../../pages/login-page";
import { createRegisterPage } from "../../pages/register-page";

test.describe("accessibility", () => {
  test("guest login page has no selected-standard violations", async ({ page }, testInfo) => {
    const loginPage = createLoginPage(page);

    // given I am a guest

    // when I visit the settled login page
    await loginPage.goto();
    await loginPage.expectVisible();

    // then the page meets the selected WCAG standards
    await expectAccessiblePage(page, testInfo, "Guest login page");
  });

  test("guest registration page has no selected-standard violations", async ({ page }, testInfo) => {
    const registerPage = createRegisterPage(page);

    // given I am a guest

    // when I visit the settled registration page
    await registerPage.goto();
    await registerPage.expectVisible();

    // then the page meets the selected WCAG standards
    await expectAccessiblePage(page, testInfo, "Guest registration page");
  });

  test("empty dashboard has no selected-standard violations", async ({ page }, testInfo) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated with no hives
    await visitAsAuthenticatedUser(page, user);

    // when the empty dashboard is settled
    await dashboardPage.expectSignedIn(user);
    await dashboardPage.emptyState.waitFor({ state: "visible" });

    // then the page meets the selected WCAG standards
    await expectAccessiblePage(page, testInfo, "Empty dashboard");
  });

  test("populated dashboard has no selected-standard violations", async ({ page }, testInfo) => {
    const user = createAuthenticatedUser();
    const dashboardPage = createHivesDashboardPage(page);
    const inspection = createInspection();

    // given I am authenticated with a hive and inspection history
    await visitAsAuthenticatedUser(page, user, [createHive({ inspections: [inspection] })]);

    // when the populated dashboard is settled
    await dashboardPage.expectSignedIn(user);
    await dashboardPage.expectHiveCard("hive-123", "North Field", "Active");
    await dashboardPage.inspectionRow("hive-123", inspection.inspectionDate).waitFor({ state: "visible" });

    // then the page meets the selected WCAG standards
    await expectAccessiblePage(page, testInfo, "Populated dashboard");
  });

  test("Add Hive dialog has no selected-standard violations", async ({ page }, testInfo) => {
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated on the empty dashboard
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());

    // when I open the Add Hive dialog
    await dashboardPage.openAddHiveModal();

    // then the dialog state meets the selected WCAG standards
    await expectAccessiblePage(page, testInfo, "Add Hive dialog");
  });

  test("Add Apiary dialog has no selected-standard violations", async ({ page }, testInfo) => {
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated on the dashboard
    await visitAsAuthenticatedUser(page, createAuthenticatedUser());

    // when I open the Add Apiary dialog
    await dashboardPage.openAddApiaryModal();

    // then the dialog state meets the selected WCAG standards
    await expectAccessiblePage(page, testInfo, "Add Apiary dialog");
  });

  test("Add Inspection dialog has no selected-standard violations", async ({ page }, testInfo) => {
    const dashboardPage = createHivesDashboardPage(page);

    // given I am authenticated with a hive
    await visitAsAuthenticatedUser(page, createAuthenticatedUser(), [createHive()]);

    // when I open the Add Inspection dialog
    await dashboardPage.openAddInspectionModal("hive-123");

    // then the dialog state meets the selected WCAG standards
    await expectAccessiblePage(page, testInfo, "Add Inspection dialog");
  });

  test("read-only inspection dialog has no selected-standard violations", async ({ page }, testInfo) => {
    const dashboardPage = createHivesDashboardPage(page);
    const inspection = createInspection();

    // given I am authenticated with inspection history
    await visitAsAuthenticatedUser(page, createAuthenticatedUser(), [createHive({ inspections: [inspection] })]);

    // when I open the historical inspection dialog
    await dashboardPage.openInspection("hive-123", inspection.inspectionDate);

    // then the read-only dialog state meets the selected WCAG standards
    await expectAccessiblePage(page, testInfo, "Read-only inspection dialog");
  });
});
