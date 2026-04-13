import type { AddressInfo } from "node:net";

import { beforeEach, describe, expect, it, vi } from "vitest";

const registerMock = vi.hoisted(() => vi.fn());
const loginMock = vi.hoisted(() => vi.fn());
const logoutMock = vi.hoisted(() => vi.fn());
const getAuthenticatedUserMock = vi.hoisted(() => vi.fn());
const requireAuthMock = vi.hoisted(() => vi.fn());

vi.mock("../src/services/auth.service.js", () => ({
  AuthService: class {
    register = registerMock;
    login = loginMock;
    logout = logoutMock;
    getAuthenticatedUser = getAuthenticatedUserMock;
  },
}));

vi.mock("../src/repositories/account.repository.js", () => ({
  AccountRepository: class {},
}));

vi.mock("../src/repositories/user.repository.js", () => ({
  UserRepository: class {},
}));

vi.mock("../src/repositories/revoked-token.repository.js", () => ({
  RevokedTokenRepository: class {},
}));

vi.mock("../src/middleware/auth.middleware.js", () => ({
  requireAuth: requireAuthMock,
}));

import { AppError } from "../src/utils/app-error.js";

describe("createApp", () => {
  beforeEach(() => {
    registerMock.mockReset();
    loginMock.mockReset();
    logoutMock.mockReset();
    getAuthenticatedUserMock.mockReset();
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
    const { createApp } = await import("../src/app.js");
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
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/health`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true });
    });
  });

  it("registers users through the auth route", async () => {
    registerMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        accountId: "account-1",
        accountName: "Acme",
      },
      token: "signed-token",
    });

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

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        message: "Validation failed",
      });
      expect(registerMock).not.toHaveBeenCalled();
    });
  });

  it("maps domain errors from routes to HTTP responses", async () => {
    registerMock.mockRejectedValue(new AppError(409, "Email is already registered"));

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

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        message: "Email is already registered",
      });
    });
  });

  it("logs users in through the auth route", async () => {
    loginMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        accountId: "account-1",
        accountName: "Acme",
      },
      token: "signed-token",
    });

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

  it("supports authenticated logout and me routes", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      accountId: "account-1",
      accountName: "Acme",
    });

    await withApp(async (baseUrl) => {
      const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
      });
      const meResponse = await fetch(`${baseUrl}/api/auth/me`);

      expect(logoutResponse.status).toBe(204);
      expect(logoutMock).toHaveBeenCalledWith({
        jti: "token-1",
        expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      });

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
});
