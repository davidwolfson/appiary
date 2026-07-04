import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { Router } from "@angular/router";
import { vi } from "vitest";

import { AuthStore } from "./auth.store";
import { authGuard } from "./auth.guard";

describe("authGuard", () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  let authStore: {
    isAuthenticated: ReturnType<typeof vi.fn>;
  };
  let router: {
    parseUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authStore = {
      isAuthenticated: vi.fn(),
    };

    router = {
      parseUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthStore, useValue: authStore },
        { provide: Router, useValue: router },
      ],
    });
  });

  it("allows navigation for authenticated users", () => {
    // given the auth store reports an authenticated user
    authStore.isAuthenticated.mockReturnValue(true);

    // when the auth guard evaluates navigation
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    // then navigation is allowed
    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to the login page", () => {
    // given the auth store reports no authenticated user
    const loginUrlTree = { redirectedTo: "/login" };

    authStore.isAuthenticated.mockReturnValue(false);
    router.parseUrl.mockReturnValue(loginUrlTree);

    // when the auth guard evaluates navigation
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    // then navigation redirects to login
    expect(router.parseUrl).toHaveBeenCalledWith("/login");
    expect(result).toBe(loginUrlTree);
  });
});
