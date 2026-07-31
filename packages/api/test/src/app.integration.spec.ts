import type { AddressInfo } from "node:net";

import { beforeEach, describe, expect, it, vi } from "vitest";

const registerMock = vi.hoisted(() => vi.fn());
const loginMock = vi.hoisted(() => vi.fn());
const logoutMock = vi.hoisted(() => vi.fn());
const getAuthenticatedUserMock = vi.hoisted(() => vi.fn());
const listForAuthenticatedUserMock = vi.hoisted(() => vi.fn());
const createForAuthenticatedUserMock = vi.hoisted(() => vi.fn());
const updateForAuthenticatedUserMock = vi.hoisted(() => vi.fn());
const createInspectionForAuthenticatedUserMock = vi.hoisted(() => vi.fn());
const requireAuthMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/services/auth.service.js", () => ({
  AuthService: class {
    register = registerMock;
    login = loginMock;
    logout = logoutMock;
    getAuthenticatedUser = getAuthenticatedUserMock;
  },
}));

vi.mock("../../src/services/hive.service.js", () => ({
  HiveService: class {
    listForAuthenticatedUser = listForAuthenticatedUserMock;
    createForAuthenticatedUser = createForAuthenticatedUserMock;
    updateForAuthenticatedUser = updateForAuthenticatedUserMock;
    createInspectionForAuthenticatedUser = createInspectionForAuthenticatedUserMock;
  },
}));

vi.mock("../../src/repositories/account.repository.js", () => ({
  AccountRepository: class {},
}));

vi.mock("../../src/repositories/user.repository.js", () => ({
  UserRepository: class {},
}));

vi.mock("../../src/repositories/hive.repository.js", () => ({
  HiveRepository: class {},
}));

vi.mock("../../src/repositories/hive-inspection.repository.js", () => ({
  HiveInspectionRepository: class {},
}));

vi.mock("../../src/repositories/revoked-token.repository.js", () => ({
  RevokedTokenRepository: class {},
}));

vi.mock("../../src/middleware/auth.middleware.js", () => ({
  requireAuth: requireAuthMock,
}));

import { AppError } from "../../src/utils/app-error.js";

describe("createApp", () => {
  beforeEach(() => {
    registerMock.mockReset();
    loginMock.mockReset();
    logoutMock.mockReset();
    getAuthenticatedUserMock.mockReset();
    listForAuthenticatedUserMock.mockReset();
    createForAuthenticatedUserMock.mockReset();
    updateForAuthenticatedUserMock.mockReset();
    createInspectionForAuthenticatedUserMock.mockReset();
    requireAuthMock.mockReset();
    requireAuthMock.mockImplementation((req, _res, next) => {
      req.authenticatedUserId = "user-1";
      req.authTokenJti = "token-1";
      req.authTokenExpiresAt = new Date("2026-01-01T00:00:00.000Z");
      next();
    });
  });

  async function withApp(
    callback: (baseUrl: string) => Promise<void>,
  ): Promise<void> {
    const { createApp } = await import("../../src/app.js");
    const app = createApp();
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    try {
      await callback(`http://127.0.0.1:${port}`);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  }

  it("serves the health endpoint", async () => {
    // given the API application is running
    // when the health endpoint is requested
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/health`);

      // then the API reports that it is healthy
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true });
    });
  });

  it("registers users through the auth route", async () => {
    // given the auth service will register a new user
    registerMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        accountId: "account-1",
        accountName: "Acme",
      },
      token: "signed-token",
    });

    // when valid registration details are posted
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          accountName: "Acme",
          email: "user@example.com",
          password: "password123",
          confirmPassword: "password123",
        }),
      });

      // then the route returns the auth result and normalized service input
      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({
        user: {
          id: "user-1",
          email: "user@example.com",
          accountId: "account-1",
          accountName: "Acme",
        },
        token: "signed-token",
      });
      expect(registerMock).toHaveBeenCalledWith({
        accountName: "Acme",
        email: "user@example.com",
        password: "password123",
      });
    });
  });

  it("returns validation errors through the centralized error middleware", async () => {
    // given registration details violate the request schema
    // when the invalid registration is posted
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          accountName: "",
          email: "bad-email",
          password: "short",
          confirmPassword: "different",
        }),
      });

      // then the route returns a validation error without calling the service
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        message: "Validation failed",
      });
      expect(registerMock).not.toHaveBeenCalled();
    });
  });

  it("maps domain errors from routes to HTTP responses", async () => {
    // given registration fails with a domain conflict
    registerMock.mockRejectedValue(new AppError(409, "Email is already registered"));

    // when valid registration details are posted
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          accountName: "Acme",
          email: "user@example.com",
          password: "password123",
          confirmPassword: "password123",
        }),
      });

      // then the conflict status and message are returned
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        message: "Email is already registered",
      });
    });
  });

  it("logs users in through the auth route", async () => {
    // given the auth service accepts valid credentials
    loginMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        accountId: "account-1",
        accountName: "Acme",
      },
      token: "signed-token",
    });

    // when the credentials are posted to the login route
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      });

      // then the route returns the token and forwards the credentials
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        token: "signed-token",
      });
      expect(loginMock).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  });

  it("logs authenticated users out", async () => {
    // given an authenticated request
    // when the logout route is called
    await withApp(async (baseUrl) => {
      const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
      });

      // then the token is revoked and no content is returned
      expect(logoutResponse.status).toBe(204);
      expect(logoutMock).toHaveBeenCalledWith({
        jti: "token-1",
        expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      });
    });
  });

  it("returns the authenticated user", async () => {
    // given an authenticated user exists
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      accountId: "account-1",
      accountName: "Acme",
    });

    // when the current-user route is called
    await withApp(async (baseUrl) => {
      const meResponse = await fetch(`${baseUrl}/api/auth/me`);

      // then the authenticated user is returned
      expect(meResponse.status).toBe(200);
      await expect(meResponse.json()).resolves.toEqual({
        id: "user-1",
        email: "user@example.com",
        accountId: "account-1",
        accountName: "Acme",
      });
      expect(getAuthenticatedUserMock).toHaveBeenCalledWith("user-1");
    });
  });

  it("lists hives through the protected hives route", async () => {
    // given an authenticated user has a hive
    listForAuthenticatedUserMock.mockResolvedValue({
      hives: [
        {
          hiveId: "hive-1",
          name: "North Field",
          status: true,
          accountId: "account-1",
          inspections: [],
        },
      ],
    });

    // when the protected hives route is requested
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives`);

      // then the route returns that user's hives
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        hives: [
          {
            hiveId: "hive-1",
            name: "North Field",
            status: true,
            inspections: [],
          },
        ],
      });
      expect(requireAuthMock).toHaveBeenCalled();
      expect(listForAuthenticatedUserMock).toHaveBeenCalledWith("user-1");
    });
  });

  it("creates hives through the protected hives route", async () => {
    // given the hive service can create a hive
    createForAuthenticatedUserMock.mockResolvedValue({
      hive: {
        hiveId: "hive-1",
        name: "North Field",
        status: true,
        accountId: "account-1",
        inspections: [],
      },
    });

    // when a hive with a padded name is posted
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "  North Field  ",
          status: true,
          inspections: [],
        }),
      });

      // then the route returns the hive and passes normalized input to the service
      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({
        hive: {
          hiveId: "hive-1",
          name: "North Field",
          status: true,
          inspections: [],
        },
      });
      expect(createForAuthenticatedUserMock).toHaveBeenCalledWith({
        authenticatedUserId: "user-1",
        name: "North Field",
        status: true,
      });
    });
  });

  it("rejects invalid hive create payloads before calling the service", async () => {
    // given the hive name is invalid
    // when the hive is posted
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "",
          status: true,
        }),
      });

      // then validation fails before the hive service is called
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        message: "Validation failed",
      });
      expect(createForAuthenticatedUserMock).not.toHaveBeenCalled();
    });
  });

  it("maps duplicate hive name errors from hives routes", async () => {
    // given hive creation fails with a duplicate-name conflict
    createForAuthenticatedUserMock.mockRejectedValue(new AppError(409, "Hive name already exists"));

    // when valid hive details are posted
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "North Field",
          status: true,
        }),
      });

      // then the route returns the conflict response
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        message: "Hive name already exists",
      });
    });
  });

  it("updates hives through the protected hives route", async () => {
    // given the hive service can update a hive
    updateForAuthenticatedUserMock.mockResolvedValue({
      hive: {
        hiveId: "37a9a6dc-3030-4be5-9694-f65c5c5f6d1e",
        name: "South Field",
        status: false,
        accountId: "account-1",
        inspections: [{
          inspectionId: "b701e3d1-e8ed-47e8-9e31-ae8389487670",
          hiveId: "37a9a6dc-3030-4be5-9694-f65c5c5f6d1e",
          inspectionDate: "2026-07-31",
          inspectionTime: "14:30",
          queenRight: true,
          eggs: true,
          larva: true,
          cappedBrood: false,
          broodPattern: "good",
          additionalNotes: "Healthy colony",
        }],
      },
    });

    // when updated hive details are put with a padded name
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives/37a9a6dc-3030-4be5-9694-f65c5c5f6d1e`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "  South Field  ",
          status: false,
          inspections: [],
        }),
      });

      // then the route returns the updated hive and forwards normalized input
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        hive: {
          hiveId: "37a9a6dc-3030-4be5-9694-f65c5c5f6d1e",
          name: "South Field",
          status: false,
          inspections: [{
            inspectionId: "b701e3d1-e8ed-47e8-9e31-ae8389487670",
            hiveId: "37a9a6dc-3030-4be5-9694-f65c5c5f6d1e",
            inspectionDate: "2026-07-31",
            inspectionTime: "14:30",
            queenRight: true,
            eggs: true,
            larva: true,
            cappedBrood: false,
            broodPattern: "good",
            additionalNotes: "Healthy colony",
          }],
        },
      });
      expect(updateForAuthenticatedUserMock).toHaveBeenCalledWith({
        authenticatedUserId: "user-1",
        hiveId: "37a9a6dc-3030-4be5-9694-f65c5c5f6d1e",
        name: "South Field",
        status: false,
      });
    });
  });

  it("rejects invalid hive update payloads before calling the service", async () => {
    // given the hive update payload is invalid
    // when the hive is put
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives/37a9a6dc-3030-4be5-9694-f65c5c5f6d1e`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "",
          status: true,
        }),
      });

      // then validation fails before the hive service is called
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        message: "Validation failed",
      });
      expect(updateForAuthenticatedUserMock).not.toHaveBeenCalled();
    });
  });

  it("rejects malformed hive IDs before calling the update service", async () => {
    // given the hive ID is malformed
    // when valid hive details are put
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives/not-a-uuid`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "South Field",
          status: false,
        }),
      });

      // then parameter validation fails before the hive service is called
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        message: "Validation failed",
      });
      expect(updateForAuthenticatedUserMock).not.toHaveBeenCalled();
    });
  });

  it("maps missing hive errors from hive update routes", async () => {
    // given hive update fails because the hive is missing
    updateForAuthenticatedUserMock.mockRejectedValue(new AppError(404, "Hive not found"));

    // when valid hive details are put
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives/00000000-0000-4000-8000-000000000000`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "South Field",
          status: false,
        }),
      });

      // then the route returns the missing-hive response
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        message: "Hive not found",
      });
    });
  });

  it("maps duplicate hive name errors from hive update routes", async () => {
    // given hive update fails with a duplicate-name conflict
    updateForAuthenticatedUserMock.mockRejectedValue(new AppError(409, "Hive name already exists"));

    // when valid hive details are put
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives/37a9a6dc-3030-4be5-9694-f65c5c5f6d1e`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "North Field",
          status: true,
        }),
      });

      // then the route returns the conflict response
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        message: "Hive name already exists",
      });
    });
  });

  it("rejects unauthenticated hive update requests", async () => {
    // given authentication rejects the request
    requireAuthMock.mockImplementation((_req, _res, next) => {
      next(new AppError(401, "Unauthorized"));
    });

    // when valid hive details are put
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives/37a9a6dc-3030-4be5-9694-f65c5c5f6d1e`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "South Field",
          status: false,
        }),
      });

      // then the route returns the auth rejection without calling the service
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        message: "Unauthorized",
      });
      expect(updateForAuthenticatedUserMock).not.toHaveBeenCalled();
    });
  });

  it("creates inspections through the protected nested hive route", async () => {
    // given the hive service can create an inspection
    createInspectionForAuthenticatedUserMock.mockResolvedValue({ inspection: {
      inspectionId: "b701e3d1-e8ed-47e8-9e31-ae8389487670",
      hiveId: "37a9a6dc-3030-4be5-9694-f65c5c5f6d1e",
      inspectionDate: "2026-07-31", inspectionTime: "14:30", queenRight: true,
      eggs: false, larva: true, cappedBrood: false, broodPattern: "good", additionalNotes: null,
    } });

    // when a valid inspection is posted
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives/37a9a6dc-3030-4be5-9694-f65c5c5f6d1e/inspections`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
          inspectionDate: "2026-07-31", inspectionTime: "14:30", queenRight: true,
          eggs: false, larva: true, cappedBrood: false, broodPattern: "good",
        }),
      });

      // then the route returns the created inspection and authenticated action
      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toMatchObject({ inspection: {
        inspectionId: "b701e3d1-e8ed-47e8-9e31-ae8389487670", additionalNotes: null,
      } });
      expect(createInspectionForAuthenticatedUserMock).toHaveBeenCalledWith({
        authenticatedUserId: "user-1", hiveId: "37a9a6dc-3030-4be5-9694-f65c5c5f6d1e",
        inspectionDate: "2026-07-31", inspectionTime: "14:30", queenRight: true,
        eggs: false, larva: true, cappedBrood: false, broodPattern: "good", additionalNotes: null,
      });
    });
  });

  it("rejects invalid inspection payloads before calling the service", async () => {
    // given an impossible date, invalid time, and missing observation booleans
    // when the inspection is posted
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives/37a9a6dc-3030-4be5-9694-f65c5c5f6d1e/inspections`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
          inspectionDate: "2026-02-30", inspectionTime: "25:00", broodPattern: "excellent",
        }),
      });

      // then request validation fails without service invocation
      expect(response.status).toBe(400);
      expect(createInspectionForAuthenticatedUserMock).not.toHaveBeenCalled();
    });
  });

  it("maps non-disclosing missing-hive inspection errors", async () => {
    // given inspection creation cannot see the target hive
    createInspectionForAuthenticatedUserMock.mockRejectedValue(new AppError(404, "Hive not found"));

    // when a valid inspection is posted
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/hives/00000000-0000-4000-8000-000000000000/inspections`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
          inspectionDate: "2026-07-31", inspectionTime: "14:30", queenRight: false,
          eggs: false, larva: false, cappedBrood: false,
        }),
      });

      // then the route returns the common hive-not-found response
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ message: "Hive not found" });
    });
  });
});
