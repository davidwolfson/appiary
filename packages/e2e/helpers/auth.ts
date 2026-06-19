import type { Page, Route } from "@playwright/test";

import type { AuthResponse, AuthenticatedUser, LoginRequest, RegisterRequest } from "@appiary/types";

import { mockListHivesRequest } from "./hives";

const authTokenStorageKey = "appiary.auth.token";

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

export async function visitAsAuthenticatedUser(page: Page, user: AuthenticatedUser, token = "token-123"): Promise<void> {
  await page.addInitScript(([storageKey, storedToken]) => {
    globalThis.localStorage.setItem(storageKey, storedToken);
  }, [authTokenStorageKey, token]);

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    });
  });
  await mockListHivesRequest(page);
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
