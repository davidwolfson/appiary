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
    // given the auth service can restore a session
    authService.restoreSession.mockResolvedValue(session);

    // when the store initializes
    await store.initialize();

    // then the session is exposed and initialization completes
    expect(authService.restoreSession).toHaveBeenCalled();
    expect(store.session()).toEqual(session);
    expect(store.user()).toEqual(user);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.isInitializing()).toBe(false);
  });

  it("logs in, stores the session, and redirects home", async () => {
    // given valid credentials resolve to an auth session
    const payload: LoginRequest = {
      email: "beekeeper@example.com",
      password: "secret123",
    };

    authService.login.mockResolvedValue(session);

    // when the store logs in
    await store.login(payload);

    // then the session is stored and navigation goes home
    expect(authService.login).toHaveBeenCalledWith(payload);
    expect(store.session()).toEqual(session);
    expect(store.error()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(store.isAuthenticated()).toBe(true);
    expect(router.navigateByUrl).toHaveBeenCalledWith("/");
  });

  it("surfaces API error messages on login failure and rethrows", async () => {
    // given the login API rejects with a message
    const error = {
      error: {
        message: "Invalid credentials",
      },
    };

    authService.login.mockRejectedValue(error);

    // when the store logs in
    const result = store.login({
      email: "beekeeper@example.com",
      password: "wrong-password",
    });

    // then the error is rethrown and exposed without navigation
    await expect(result).rejects.toBe(error);

    expect(store.session()).toBeNull();
    expect(store.error()).toBe("Invalid credentials");
    expect(store.isLoading()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it("logs out, clears the session, and redirects to login", async () => {
    // given the store has a session and logout succeeds
    authService.restoreSession.mockResolvedValue(session);
    authService.logout.mockResolvedValue(undefined);

    // when the store logs out
    await store.initialize();
    await store.logout();

    // then the session is cleared and navigation goes to login
    expect(authService.logout).toHaveBeenCalled();
    expect(store.session()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith("/login");
  });

  it("keeps the current session and exposes a fallback message when logout fails", async () => {
    // given the store has a session and logout fails without an API message
    authService.restoreSession.mockResolvedValue(session);
    authService.logout.mockRejectedValue(new Error("logout failed"));

    // when the store logs out
    await store.initialize();
    await store.logout();

    // then the session remains and a fallback error is exposed
    expect(store.session()).toEqual(session);
    expect(store.error()).toBe("Something went wrong");
    expect(store.isLoading()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalledWith("/login");
  });
});
