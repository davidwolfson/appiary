import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { vi } from "vitest";

import type { AuthResponse, AuthenticatedUser, LoginRequest, RegisterRequest } from "@appiary/types";

import { AuthApi } from "./auth.api";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let authApi: {
    getMe: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
  };

  const user: AuthenticatedUser = {
    id: "user-1",
    email: "beekeeper@example.com",
    accountId: "account-1",
    accountName: "Apiary",
  };

  const authResponse: AuthResponse = {
    user,
    token: "token-123",
  };

  beforeEach(() => {
    globalThis.localStorage.clear();

    authApi = {
      getMe: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthService,
        { provide: AuthApi, useValue: authApi },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it("registers and persists the returned token", async () => {
    const payload: RegisterRequest = {
      accountName: "Apiary",
      email: "beekeeper@example.com",
      password: "secret123",
      confirmPassword: "secret123",
    };

    authApi.register.mockReturnValue(of(authResponse));

    await expect(service.register(payload)).resolves.toEqual({
      token: "token-123",
      user,
    });
    expect(authApi.register).toHaveBeenCalledWith(payload);
    expect(service.getToken()).toBe("token-123");
  });

  it("logs in and persists the returned token", async () => {
    const payload: LoginRequest = {
      email: "beekeeper@example.com",
      password: "secret123",
    };

    authApi.login.mockReturnValue(of(authResponse));

    await expect(service.login(payload)).resolves.toEqual({
      token: "token-123",
      user,
    });
    expect(authApi.login).toHaveBeenCalledWith(payload);
    expect(service.getToken()).toBe("token-123");
  });

  it("clears the persisted token after logout even if the API call fails", async () => {
    globalThis.localStorage.setItem("appiary.auth.token", "token-123");
    authApi.logout.mockReturnValue(throwError(() => new Error("logout failed")));

    await expect(service.logout()).rejects.toThrow("logout failed");

    expect(authApi.logout).toHaveBeenCalled();
    expect(service.getToken()).toBeNull();
  });

  it("restores a session from the persisted token and current user", async () => {
    globalThis.localStorage.setItem("appiary.auth.token", "token-123");
    authApi.getMe.mockReturnValue(of(user));

    await expect(service.restoreSession()).resolves.toEqual({
      token: "token-123",
      user,
    });
    expect(authApi.getMe).toHaveBeenCalled();
  });

  it("returns null when there is no persisted token", async () => {
    await expect(service.restoreSession()).resolves.toBeNull();

    expect(authApi.getMe).not.toHaveBeenCalled();
  });

  it("clears the persisted token when session restoration fails", async () => {
    globalThis.localStorage.setItem("appiary.auth.token", "token-123");
    authApi.getMe.mockReturnValue(throwError(() => new Error("unauthorized")));

    await expect(service.restoreSession()).resolves.toBeNull();

    expect(service.getToken()).toBeNull();
  });

  it("clears the current session token", () => {
    globalThis.localStorage.setItem("appiary.auth.token", "token-123");

    service.clearSession();

    expect(service.getToken()).toBeNull();
  });
});
