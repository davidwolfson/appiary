import type { Page, Route } from "@playwright/test";

import type {
  CreateHiveRequest,
  HiveResponse,
  ListHivesResponse,
  UpdateHiveRequest,
} from "@appiary/types";

export function createHive(overrides: Partial<HiveResponse> = {}): HiveResponse {
  return {
    hiveId: "hive-123",
    name: "North Field",
    status: true,
    inspections: [],
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
  await page.route("**/api/hives", async (route) => {
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
  });
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
