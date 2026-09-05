import type { Page, Route } from "@playwright/test";

import type {
  ApiaryResponse,
  CreateApiaryRequest,
  ListApiariesResponse,
} from "@appiary/types";

export const defaultApiaryId = "00000000-0000-4000-8000-000000000001";

const listApiariesHandlers = new WeakMap<Page, (route: Route) => Promise<void>>();

export function createApiary(overrides: Partial<ApiaryResponse> = {}): ApiaryResponse {
  return {
    apiaryId: defaultApiaryId,
    name: "Home Apiary",
    status: true,
    ...overrides,
  };
}

export function createApiaryInput(overrides: Partial<CreateApiaryRequest> = {}): CreateApiaryRequest {
  return { name: "Home Apiary", ...overrides };
}

export async function mockListApiariesRequest(
  page: Page,
  apiariesOrHandler: ApiaryResponse[] | ((route: Route) => Promise<void>) = [createApiary()],
): Promise<void> {
  const previousHandler = listApiariesHandlers.get(page);
  if (previousHandler) await page.unroute("**/api/apiaries", previousHandler);

  const handler = async (route: Route): Promise<void> => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    if (typeof apiariesOrHandler === "function") {
      await apiariesOrHandler(route);
      return;
    }
    const response: ListApiariesResponse = { apiaries: apiariesOrHandler };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  };

  listApiariesHandlers.set(page, handler);
  await page.route("**/api/apiaries", handler);
}

export async function mockCreateApiaryRequest(
  page: Page,
  handler: (route: Route, payload: CreateApiaryRequest) => Promise<void>,
): Promise<{ requests: CreateApiaryRequest[] }> {
  const requests: CreateApiaryRequest[] = [];
  await page.route("**/api/apiaries", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const payload = route.request().postDataJSON() as CreateApiaryRequest;
    requests.push(payload);
    await handler(route, payload);
  });
  return { requests };
}
