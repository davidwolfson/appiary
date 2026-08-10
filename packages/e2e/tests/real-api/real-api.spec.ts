import { expect, test, type Request } from "@playwright/test";

import type {
  AuthResponse,
  CreateHiveInspectionRequest,
  CreateHiveInspectionResponse,
  CreateHiveResponse,
  ListHiveInspectionsResponse,
  ListHivesResponse,
} from "@appiary/types";

import {
  createHiveThroughRealApi,
  createInspectionThroughRealApi,
  createRealApiIdentity,
  createRealHiveInput,
  createRealInspectionInput,
  RealApiCleanup,
  registerThroughRealApi,
} from "../../helpers/real-api";
import { routes } from "../../helpers/routes";
import { createHivesDashboardPage } from "../../pages/hives-dashboard-page";
import { createLoginPage } from "../../pages/login-page";
import { createRegisterPage } from "../../pages/register-page";

test.describe("real API smoke", () => {
  const cleanup = new RealApiCleanup();

  test.afterEach(async () => {
    await cleanup.cleanupTrackedAccounts();
  });

  test.afterAll(async () => {
    await cleanup.close();
  });

  test("persists a UI-created hive and inspection @real-api", async ({ page }) => {
    const identity = createRealApiIdentity();
    const hiveInput = createRealHiveInput();
    const inspectionInput = createRealInspectionInput(7, {
      inspectionDate: "2026-08-07",
      inspectionTime: "14:35",
      additionalNotes: `Lifecycle marker ${crypto.randomUUID()}`,
    });
    const registerPage = createRegisterPage(page);
    const loginPage = createLoginPage(page);
    const dashboardPage = createHivesDashboardPage(page);

    // given a guest browser observes real application requests without replacing them
    cleanup.recordRegistration(identity.email);
    const registerResponsePromise = page.waitForResponse(isApiResponse("POST", "/api/auth/register"));
    await registerPage.goto();

    // when the guest registers, creates a hive and inspection, reloads, and signs in again
    await registerPage.fillForm(identity.registration);
    const initialListHivesResponsePromise = page.waitForResponse(isApiResponse("GET", "/api/hives"));
    await registerPage.submit();
    const registrationResponse = await registerResponsePromise;
    const registration = await registrationResponse.json() as AuthResponse;
    cleanup.recordAccount(registration.user.accountId);
    await page.waitForURL(/\/$/);
    const initialListHivesResponse = await initialListHivesResponsePromise;
    await initialListHivesResponse.finished();
    await dashboardPage.emptyState.waitFor({ state: "visible" });

    const createHiveResponsePromise = page.waitForResponse(isApiResponse("POST", "/api/hives"));
    await dashboardPage.openAddHiveModal();
    await dashboardPage.fillForm(hiveInput);
    await dashboardPage.submit();
    const createHiveResponse = await createHiveResponsePromise;
    const createdHive = await createHiveResponse.json() as CreateHiveResponse;
    const createHiveRequest = createHiveResponse.request();

    const createInspectionResponsePromise = page.waitForResponse(
      isApiResponse("POST", `/api/hives/${createdHive.hive.hiveId}/inspections`),
    );
    await dashboardPage.openAddInspectionModal(createdHive.hive.hiveId);
    await dashboardPage.fillInspectionForm(inspectionInput);
    await dashboardPage.saveInspectionButton.click();
    const createInspectionResponse = await createInspectionResponsePromise;
    const createdInspection = await createInspectionResponse.json() as CreateHiveInspectionResponse;
    const createInspectionRequest = createInspectionResponse.request();
    await dashboardPage.inspectionModal.waitFor({ state: "hidden" });

    await page.reload();
    await page.waitForURL(new RegExp(`${routes.login}$`));
    const routeAfterReload = new URL(page.url()).pathname;

    const loginResponsePromise = page.waitForResponse(isApiResponse("POST", "/api/auth/login"));
    const listHivesResponsePromise = page.waitForResponse(isApiResponse("GET", "/api/hives"));
    await loginPage.fillForm({ email: identity.email, password: identity.password });
    await loginPage.submit();
    const loginResponse = await loginResponsePromise;
    const login = await loginResponse.json() as AuthResponse;
    const listHivesResponse = await listHivesResponsePromise;
    const persistedHives = await listHivesResponse.json() as ListHivesResponse;
    const listHivesRequest = listHivesResponse.request();
    await dashboardPage.openInspection(createdHive.hive.hiveId, inspectionInput.inspectionDate);

    // then both browser creates used the registration token and persisted DTO-compatible values
    expect(registrationResponse.status()).toBe(201);
    expect(initialListHivesResponse.status()).toBe(200);
    expect(createHiveResponse.status()).toBe(201);
    expect(createInspectionResponse.status()).toBe(201);
    expectAuthorization(createHiveRequest, registration.token);
    expectAuthorization(createInspectionRequest, registration.token);
    expect(createHiveRequest.postDataJSON()).toEqual(hiveInput);
    expect(createInspectionRequest.postDataJSON()).toEqual(inspectionInput);
    expect(createdInspection.inspection).toMatchObject({
      hiveId: createdHive.hive.hiveId,
      ...inspectionInput,
    });
    expect(routeAfterReload).toBe(routes.login);

    // then the new login token loads the persisted hive and inspection back into the UI
    expectAuthorization(listHivesRequest, login.token);
    expect(login.token).not.toBe(registration.token);
    expect(persistedHives.hives).toContainEqual(expect.objectContaining({
      hiveId: createdHive.hive.hiveId,
      name: hiveInput.name,
      status: true,
      inspections: [expect.objectContaining({
        inspectionId: createdInspection.inspection.inspectionId,
        additionalNotes: inspectionInput.additionalNotes,
      })],
    }));
    await dashboardPage.expectHiveCard(createdHive.hive.hiveId, hiveInput.name, "Active");
    await expect(dashboardPage.additionalNotesInput).toHaveValue(inspectionInput.additionalNotes ?? "");
  });

  test("loads a persisted second inspection page @real-api", async ({ page, request }) => {
    const identity = createRealApiIdentity();
    const hiveInput = createRealHiveInput();
    const inspections: CreateHiveInspectionRequest[] = Array.from({ length: 6 }, (_, index) =>
      createRealInspectionInput(index + 1, {
        inspectionDate: `2026-08-${String(index + 1).padStart(2, "0")}`,
        inspectionTime: "10:15",
        additionalNotes: `${index === 0 ? "Oldest" : "Page one"} marker ${crypto.randomUUID()}`,
      }));
    const loginPage = createLoginPage(page);
    const dashboardPage = createHivesDashboardPage(page);

    // given a real account has one hive and six deliberately ordered persisted inspections
    const registration = await registerThroughRealApi(request, cleanup, identity.registration);
    const createdHive = await createHiveThroughRealApi(request, registration.token, hiveInput);
    for (const inspection of inspections) {
      await createInspectionThroughRealApi(request, registration.token, createdHive.hive.hiveId, inspection);
    }
    const listHivesResponsePromise = page.waitForResponse(isApiResponse("GET", "/api/hives"));
    await loginPage.goto();

    // when the user signs in and advances the hive to inspection page two
    await loginPage.fillForm({ email: identity.email, password: identity.password });
    const loginResponsePromise = page.waitForResponse(isApiResponse("POST", "/api/auth/login"));
    await loginPage.submit();
    const loginResponse = await loginResponsePromise;
    const login = await loginResponse.json() as AuthResponse;
    const listHivesResponse = await listHivesResponsePromise;
    const firstPage = await listHivesResponse.json() as ListHivesResponse;
    const secondPageResponsePromise = page.waitForResponse(
      isApiResponse("GET", `/api/hives/${createdHive.hive.hiveId}/inspections`, "page=2"),
    );
    await dashboardPage.showNextInspections(createdHive.hive.hiveId);
    const secondPageResponse = await secondPageResponsePromise;
    const secondPage = await secondPageResponse.json() as ListHiveInspectionsResponse;
    const secondPageRequest = secondPageResponse.request();

    // then the initial production response contains the newest five rows and complete metadata
    const firstPageHive = firstPage.hives.find(({ hiveId }) => hiveId === createdHive.hive.hiveId);
    expect(firstPageHive?.inspections).toHaveLength(5);
    expect(firstPageHive?.inspectionPagination).toEqual({
      page: 1,
      pageSize: 5,
      totalItems: 6,
      totalPages: 2,
    });
    expect(firstPageHive?.inspections.map(({ inspectionDate }) => inspectionDate)).toEqual([
      "2026-08-06", "2026-08-05", "2026-08-04", "2026-08-03", "2026-08-02",
    ]);

    // then the exact authorized page-two request returns and renders only the oldest row
    expect(new URL(secondPageRequest.url()).pathname).toBe(`/api/hives/${createdHive.hive.hiveId}/inspections`);
    expect(new URL(secondPageRequest.url()).search).toBe("?page=2");
    expectAuthorization(secondPageRequest, login.token);
    expect(secondPage).toMatchObject({
      inspections: [expect.objectContaining({
        inspectionDate: inspections[0].inspectionDate,
        additionalNotes: inspections[0].additionalNotes,
      })],
      pagination: { page: 2, pageSize: 5, totalItems: 6, totalPages: 2 },
    });
    await expect(dashboardPage.inspectionRow(createdHive.hive.hiveId, inspections[0].inspectionDate)).toBeVisible();
    await expect(dashboardPage.inspectionRow(createdHive.hive.hiveId, inspections[5].inspectionDate)).toHaveCount(0);
    await expect(dashboardPage.previousInspectionsButton(createdHive.hive.hiveId)).toBeEnabled();
    await expect(dashboardPage.nextInspectionsButton(createdHive.hive.hiveId)).toBeDisabled();
  });
});

function isApiResponse(method: string, pathname: string, search = "") {
  return (response: { request(): Request; url(): string }): boolean => {
    const url = new URL(response.url());
    return response.request().method() === method && url.pathname === pathname && url.search.slice(1) === search;
  };
}

function expectAuthorization(request: Request, token: string): void {
  expect(request.headers()["authorization"]).toBe(`Bearer ${token}`);
}
