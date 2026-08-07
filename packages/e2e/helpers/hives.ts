import type { Page, Route } from "@playwright/test";

import type {
  CreateHiveRequest,
  CreateHiveInspectionRequest,
  HiveInspectionResponse,
  HiveResponse,
  ListHiveInspectionsResponse,
  ListHivesResponse,
  UpdateHiveRequest,
} from "@appiary/types";

const listHivesHandlers = new WeakMap<Page, (route: Route) => Promise<void>>();

export function createHive(overrides: Partial<HiveResponse> = {}): HiveResponse {
  return {
    hiveId: "hive-123",
    name: "North Field",
    status: true,
    inspections: [],
    ...overrides,
  };
}

export function createInspection(overrides: Partial<HiveInspectionResponse> = {}): HiveInspectionResponse {
  return {
    inspectionId: "inspection-123", hiveId: "hive-123", inspectionDate: "2026-07-30", inspectionTime: "09:15",
    queenRight: true, eggs: true, larva: true, cappedBrood: false, broodPattern: "good", additionalNotes: "Healthy colony",
    ...overrides,
  };
}

export function createInspectionInput(overrides: Partial<CreateHiveInspectionRequest> = {}): CreateHiveInspectionRequest {
  return {
    inspectionDate: "2026-07-31", inspectionTime: "10:30", queenRight: true, eggs: true,
    larva: false, cappedBrood: true, broodPattern: "fair", additionalNotes: "Add feed",
    ...overrides,
  };
}

export function createHiveInput(overrides: Partial<CreateHiveRequest> = {}): CreateHiveRequest {
  return {
    name: "North Field",
    status: true,
    ...overrides,
  };
}

export async function mockListHivesRequest(
  page: Page,
  hivesOrHandler: HiveResponse[] | ((route: Route) => Promise<void>) = [],
): Promise<void> {
  const previousHandler = listHivesHandlers.get(page);
  if (previousHandler) {
    await page.unroute("**/api/hives", previousHandler);
  }

  const handler = async (route: Route): Promise<void> => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    if (typeof hivesOrHandler === "function") {
      await hivesOrHandler(route);
      return;
    }

    const response: ListHivesResponse = { hives: hivesOrHandler };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  };

  listHivesHandlers.set(page, handler);
  await page.route("**/api/hives", handler);
}

export async function mockCreateHiveRequest(
  page: Page,
  handler: (route: Route, payload: CreateHiveRequest) => Promise<void>,
): Promise<{ requests: CreateHiveRequest[] }> {
  const requests: CreateHiveRequest[] = [];

  await page.route("**/api/hives", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    const payload = route.request().postDataJSON() as CreateHiveRequest;
    requests.push(payload);
    await handler(route, payload);
  });

  return { requests };
}

export async function mockUpdateHiveRequest(
  page: Page,
  handler: (route: Route, hiveId: string, payload: UpdateHiveRequest) => Promise<void>,
): Promise<{ requests: Array<{ hiveId: string; payload: UpdateHiveRequest }> }> {
  const requests: Array<{ hiveId: string; payload: UpdateHiveRequest }> = [];

  await page.route("**/api/hives/*", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback();
      return;
    }

    const hiveId = route.request().url().split("/").at(-1) ?? "";
    const payload = route.request().postDataJSON() as UpdateHiveRequest;
    requests.push({ hiveId, payload });
    await handler(route, hiveId, payload);
  });

  return { requests };
}

export async function mockCreateInspectionRequest(
  page: Page,
  handler: (route: Route, hiveId: string, payload: CreateHiveInspectionRequest) => Promise<void>,
): Promise<{ requests: Array<{ hiveId: string; payload: CreateHiveInspectionRequest }> }> {
  const requests: Array<{ hiveId: string; payload: CreateHiveInspectionRequest }> = [];
  await page.route("**/api/hives/*/inspections", async (route) => {
    if (route.request().method() !== "POST") { await route.fallback(); return; }
    const segments = new URL(route.request().url()).pathname.split("/");
    const hiveId = segments.at(-2) ?? "";
    const payload = route.request().postDataJSON() as CreateHiveInspectionRequest;
    requests.push({ hiveId, payload });
    await handler(route, hiveId, payload);
  });
  return { requests };
}

export async function mockListInspectionsRequest(
  page: Page,
  handler: (route: Route, hiveId: string, pageNumber: number) => Promise<void>,
): Promise<{ requests: Array<{ hiveId: string; page: number }> }> {
  const requests: Array<{ hiveId: string; page: number }> = [];

  await page.route("**/api/hives/*/inspections?*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    const url = new URL(route.request().url());
    const segments = url.pathname.split("/");
    const hiveId = segments.at(-2) ?? "";
    const pageNumber = Number(url.searchParams.get("page"));
    requests.push({ hiveId, page: pageNumber });
    await handler(route, hiveId, pageNumber);
  });

  return { requests };
}

export async function fulfillInspectionPage(
  route: Route,
  response: ListHiveInspectionsResponse,
): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(response),
  });
}
