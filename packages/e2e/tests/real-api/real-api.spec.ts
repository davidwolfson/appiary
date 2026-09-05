import { expect, test, type Request } from "@playwright/test";

import type {
  AuthResponse,
  CreateApiaryResponse,
  CreateHiveInspectionRequest,
  CreateHiveInspectionResponse,
  CreateHiveResponse,
  ListApiariesResponse,
  ListHiveInspectionsResponse,
  ListHivesResponse,
} from "@appiary/types";

import {
  createApiaryThroughRealApi,
  createHiveThroughRealApi,
  createInspectionThroughRealApi,
  createRealApiaryInput,
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
    const apiaryInput = createRealApiaryInput();
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

    // when the guest registers, creates an apiary, hive, and inspection, reloads, and signs in again
    await registerPage.fillForm(identity.registration);
    const initialListApiariesResponsePromise = page.waitForResponse(isApiResponse("GET", "/api/apiaries"));
    await registerPage.submit();
    const registrationResponse = await registerResponsePromise;
    const registration = await registrationResponse.json() as AuthResponse;
    cleanup.recordAccount(registration.user.accountId);
    await page.waitForURL(/\/$/);
    const initialListApiariesResponse = await initialListApiariesResponsePromise;
    await initialListApiariesResponse.finished();
    await page.getByRole("heading", { name: "No apiaries yet" }).waitFor({ state: "visible" });

    const createApiaryResponsePromise = page.waitForResponse(isApiResponse("POST", "/api/apiaries"));
    await dashboardPage.openAddApiaryModal();
    await dashboardPage.fillApiaryForm(apiaryInput);
    await dashboardPage.submitApiary();
    const createApiaryResponse = await createApiaryResponsePromise;
    const createdApiary = await createApiaryResponse.json() as CreateApiaryResponse;
    const hiveInput = createRealHiveInput(createdApiary.apiary.apiaryId);
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
    const listHivesResponsePromise = page.waitForResponse(
      isApiResponse("GET", "/api/hives", `apiaryId=${createdApiary.apiary.apiaryId}`),
    );
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
    expect(initialListApiariesResponse.status()).toBe(200);
    expect(createApiaryResponse.status()).toBe(201);
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
    const createdApiary = await createApiaryThroughRealApi(request, registration.token, createRealApiaryInput());
    const hiveInput = createRealHiveInput(createdApiary.apiary.apiaryId);
    const createdHive = await createHiveThroughRealApi(request, registration.token, hiveInput);
    for (const inspection of inspections) {
      await createInspectionThroughRealApi(request, registration.token, createdHive.hive.hiveId, inspection);
    }
    const listHivesResponsePromise = page.waitForResponse(
      isApiResponse("GET", "/api/hives", `apiaryId=${createdApiary.apiary.apiaryId}`),
    );
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

  test("persists apiary filtering and hive reassignment with account isolation @real-api", async ({ page, request }) => {
    const ownerIdentity = createRealApiIdentity();
    const foreignIdentity = createRealApiIdentity();
    const loginPage = createLoginPage(page);
    const dashboardPage = createHivesDashboardPage(page);

    // given two accounts own separate apiaries and the first account owns hives in two apiaries
    const owner = await registerThroughRealApi(request, cleanup, ownerIdentity.registration);
    const apiaryOne = await createApiaryThroughRealApi(request, owner.token, { name: `Orchard ${crypto.randomUUID()}` });
    const apiaryTwo = await createApiaryThroughRealApi(request, owner.token, { name: `Meadow ${crypto.randomUUID()}` });
    const hiveOneInput = createRealHiveInput(apiaryOne.apiary.apiaryId);
    const hiveTwoInput = createRealHiveInput(apiaryTwo.apiary.apiaryId);
    const hiveOne = await createHiveThroughRealApi(request, owner.token, hiveOneInput);
    const hiveTwo = await createHiveThroughRealApi(request, owner.token, hiveTwoInput);
    const foreign = await registerThroughRealApi(request, cleanup, foreignIdentity.registration);
    const foreignApiary = await createApiaryThroughRealApi(request, foreign.token, { name: `Foreign ${crypto.randomUUID()}` });
    const foreignHive = await createHiveThroughRealApi(request, foreign.token, createRealHiveInput(foreignApiary.apiary.apiaryId));

    await loginPage.goto();
    await loginPage.fillForm({ email: ownerIdentity.email, password: ownerIdentity.password });
    const ownerLoginResponsePromise = page.waitForResponse(isApiResponse("POST", "/api/auth/login"));
    const apiariesResponsePromise = page.waitForResponse(isApiResponse("GET", "/api/apiaries"));
    const initialHivesResponsePromise = page.waitForResponse(isApiResponse("GET", "/api/hives", null));
    await loginPage.submit();
    const ownerLogin = await (await ownerLoginResponsePromise).json() as AuthResponse;
    const apiariesResponse = await apiariesResponsePromise;
    const listedApiaries = await apiariesResponse.json() as ListApiariesResponse;
    await initialHivesResponsePromise;
    await dashboardPage.selectApiary(apiaryOne.apiary.apiaryId);
    await dashboardPage.expectHiveCard(hiveOne.hive.hiveId, hiveOneInput.name, "Active");

    // when the owner reassigns the first hive to the second apiary
    const updateResponsePromise = page.waitForResponse(isApiResponse("PUT", `/api/hives/${hiveOne.hive.hiveId}`));
    await dashboardPage.openEditHiveModal(hiveOne.hive.hiveId);
    await dashboardPage.fillForm({ ...hiveOneInput, apiaryId: apiaryTwo.apiary.apiaryId });
    await dashboardPage.submit();
    const updateResponse = await updateResponsePromise;
    const updateRequest = updateResponse.request();

    await page.reload();
    await page.waitForURL(new RegExp(`${routes.login}$`));
    await loginPage.fillForm({ email: ownerIdentity.email, password: ownerIdentity.password });
    await loginPage.submit();
    await dashboardPage.selectApiary(apiaryTwo.apiary.apiaryId);

    // then only owner data is visible and the reassignment persisted across the fresh login
    expect(listedApiaries.apiaries.map(({ apiaryId }) => apiaryId).sort()).toEqual([
      apiaryOne.apiary.apiaryId,
      apiaryTwo.apiary.apiaryId,
    ].sort());
    expect(listedApiaries.apiaries).not.toContainEqual(expect.objectContaining({ apiaryId: foreignApiary.apiary.apiaryId }));
    expect(updateRequest.postDataJSON()).toEqual({ ...hiveOneInput, apiaryId: apiaryTwo.apiary.apiaryId });
    expectAuthorization(updateRequest, ownerLogin.token);
    await dashboardPage.expectHiveCard(hiveOne.hive.hiveId, hiveOneInput.name, "Active");
    await dashboardPage.expectHiveCard(hiveTwo.hive.hiveId, hiveTwoInput.name, "Active");
    await expect(dashboardPage.hiveCard(foreignHive.hive.hiveId)).toHaveCount(0);
  });
});

function isApiResponse(method: string, pathname: string, search: string | null = "") {
  return (response: { request(): Request; url(): string }): boolean => {
    const url = new URL(response.url());
    return response.request().method() === method
      && url.pathname === pathname
      && (search === null || url.search.slice(1) === search);
  };
}

function expectAuthorization(request: Request, token: string): void {
  expect(request.headers()["authorization"]).toBe(`Bearer ${token}`);
}
