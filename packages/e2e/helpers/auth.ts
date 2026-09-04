import type { Page, Route } from "@playwright/test";

import type { ApiaryResponse, AuthResponse, AuthenticatedUser, HiveResponse, LoginRequest, RegisterRequest } from "@appiary/types";

import { createApiary, mockListApiariesRequest } from "./apiaries";
import { mockListHivesRequest } from "./hives";
import { createLoginPage } from "../pages/login-page";

export function createAuthenticatedUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-123",
    email: "beekeeper@example.com",
    accountId: "account-123",
    accountName: "Appiary",
    ...overrides,
  };
}

export function createAuthResponse(user: AuthenticatedUser, token = "token-123"): AuthResponse {
  return {
    token,
    user,
  };
}

export async function visitAsAuthenticatedUser(
  page: Page,
  user: AuthenticatedUser,
  hivesOrHandler: HiveResponse[] | ((route: Route) => Promise<void>) = [],
  token = "token-123",
  apiariesOrHandler: ApiaryResponse[] | ((route: Route) => Promise<void>) = [createApiary()],
): Promise<{ hiveRequests: Array<{ apiaryId: string | null }> }> {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(createAuthResponse(user, token)),
    });
  });
  await mockListApiariesRequest(page, apiariesOrHandler);
  const { requests: hiveRequests } = await mockListHivesRequest(page, hivesOrHandler);
  const loginPage = createLoginPage(page);
  await loginPage.goto();
  await loginPage.fillForm({ email: user.email, password: "secret123" });
  await loginPage.submit();
  await page.waitForURL(/\/$/);
  return { hiveRequests };
}

export async function mockLoginRequest(
  page: Page,
  handler: (route: Route, payload: LoginRequest) => Promise<void>,
): Promise<{ requests: LoginRequest[] }> {
  const requests: LoginRequest[] = [];

  await page.route("**/api/auth/login", async (route) => {
    const payload = route.request().postDataJSON() as LoginRequest;
    requests.push(payload);
    await handler(route, payload);
  });

  return { requests };
}

export async function mockRegisterRequest(
  page: Page,
  handler: (route: Route, payload: RegisterRequest) => Promise<void>,
): Promise<{ requests: RegisterRequest[] }> {
  const requests: RegisterRequest[] = [];

  await page.route("**/api/auth/register", async (route) => {
    const payload = route.request().postDataJSON() as RegisterRequest;
    requests.push(payload);
    await handler(route, payload);
  });

  return { requests };
}
