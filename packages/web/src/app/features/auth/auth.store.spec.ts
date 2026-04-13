import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { vi } from "vitest";

import type { AuthenticatedUser, LoginRequest } from "@appiary/types";

import { AuthService } from "./auth.service";
import type { AuthSession } from "./auth.mapper";
import { AuthStore } from "./auth.store";

describe("AuthStore", () => {
  let store: AuthStore;
  let authService: {
    initialize?: never;
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    restoreSession: ReturnType<typeof vi.fn>;
  };
  let router: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  const user: AuthenticatedUser = {
    id: "user-1",
    email: "beekeeper@example.com",
    accountId: "account-1",
    accountName: "Apiary",
  };

  const session: AuthSession = {
    token: "token-123",
    user,
  };

  beforeEach(() => {
    authService = {
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      restoreSession: vi.fn(),
    };

    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthStore,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });

    store = TestBed.inject(AuthStore);
  });

  it("initializes from a restored session and clears the initializing flag", async () => {
    authService.restoreSession.mockResolvedValue(session);

    await store.initialize();

    expect(authService.restoreSession).toHaveBeenCalled();
    expect(store.session()).toEqual(session);
    expect(store.user()).toEqual(user);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.isInitializing()).toBe(false);
  });

  it("logs in, stores the session, and redirects home", async () => {
    const payload: LoginRequest = {
      email: "beekeeper@example.com",
      password: "secret123",
    };

    authService.login.mockResolvedValue(session);

    await store.login(payload);

    expect(authService.login).toHaveBeenCalledWith(payload);
    expect(store.session()).toEqual(session);
    expect(store.error()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(store.isAuthenticated()).toBe(true);
    expect(router.navigateByUrl).toHaveBeenCalledWith("/");
  });

  it("surfaces API error messages on login failure and rethrows", async () => {
    const error = {
      error: {
        message: "Invalid credentials",
      },
    };

    authService.login.mockRejectedValue(error);

    await expect(
      store.login({
        email: "beekeeper@example.com",
        password: "wrong-password",
      }),
    ).rejects.toBe(error);

    expect(store.session()).toBeNull();
    expect(store.error()).toBe("Invalid credentials");
    expect(store.isLoading()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it("logs out, clears the session, and redirects to login", async () => {
    authService.restoreSession.mockResolvedValue(session);
    authService.logout.mockResolvedValue(undefined);

    await store.initialize();
    await store.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(store.session()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith("/login");
  });

  it("keeps the current session and exposes a fallback message when logout fails", async () => {
    authService.restoreSession.mockResolvedValue(session);
    authService.logout.mockRejectedValue(new Error("logout failed"));

    await store.initialize();
    await store.logout();

    expect(store.session()).toEqual(session);
    expect(store.error()).toBe("Something went wrong");
    expect(store.isLoading()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalledWith("/login");
  });
});
