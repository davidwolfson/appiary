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
    // given valid registration details and a successful API response are available
    const payload: RegisterRequest = {
      accountName: "Apiary",
      email: "beekeeper@example.com",
      password: "secret123",
      confirmPassword: "secret123",
    };

    authApi.register.mockReturnValue(of(authResponse));

    // when the service registers the user
    const result = service.register(payload);

    // then the auth session is returned and its token is persisted
    await expect(result).resolves.toEqual({
      token: "token-123",
      user,
    });
    expect(authApi.register).toHaveBeenCalledWith(payload);
    expect(service.getToken()).toBe("token-123");
  });

  it("logs in and persists the returned token", async () => {
    // given valid credentials and a successful API response are available
    const payload: LoginRequest = {
      email: "beekeeper@example.com",
      password: "secret123",
    };

    authApi.login.mockReturnValue(of(authResponse));

    // when the service logs the user in
    const result = service.login(payload);

    // then the auth session is returned and its token is persisted
    await expect(result).resolves.toEqual({
      token: "token-123",
      user,
    });
    expect(authApi.login).toHaveBeenCalledWith(payload);
    expect(service.getToken()).toBe("token-123");
  });

  it("clears the persisted token after logout even if the API call fails", async () => {
    // given a token is persisted and the logout API will fail
    globalThis.localStorage.setItem("appiary.auth.token", "token-123");
    authApi.logout.mockReturnValue(throwError(() => new Error("logout failed")));

    // when the service logs out
    const result = service.logout();

    // then the API error propagates after the local token is cleared
    await expect(result).rejects.toThrow("logout failed");

    expect(authApi.logout).toHaveBeenCalled();
    expect(service.getToken()).toBeNull();
  });

  it("restores a session from the persisted token and current user", async () => {
    // given a token is persisted and the API returns the current user
    globalThis.localStorage.setItem("appiary.auth.token", "token-123");
    authApi.getMe.mockReturnValue(of(user));

    // when the service restores the session
    const result = service.restoreSession();

    // then the token and current user form the restored session
    await expect(result).resolves.toEqual({
      token: "token-123",
      user,
    });
    expect(authApi.getMe).toHaveBeenCalled();
  });

  it("returns null when there is no persisted token", async () => {
    // given no auth token is persisted
    // when the service restores the session
    const result = service.restoreSession();

    // then no session is returned and the API is not called
    await expect(result).resolves.toBeNull();

    expect(authApi.getMe).not.toHaveBeenCalled();
  });

  it("clears the persisted token when session restoration fails", async () => {
    // given a token is persisted but the current-user request fails
    globalThis.localStorage.setItem("appiary.auth.token", "token-123");
    authApi.getMe.mockReturnValue(throwError(() => new Error("unauthorized")));

    // when the service restores the session
    const result = service.restoreSession();

    // then no session is returned and the invalid token is removed
    await expect(result).resolves.toBeNull();

    expect(service.getToken()).toBeNull();
  });

  it("clears the current session token", () => {
    // given an auth token is persisted
    globalThis.localStorage.setItem("appiary.auth.token", "token-123");

    // when the service clears the session
    service.clearSession();

    // then the persisted token is removed
    expect(service.getToken()).toBeNull();
  });
});
