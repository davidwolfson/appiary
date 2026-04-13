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
    authStore.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to the login page", () => {
    const loginUrlTree = { redirectedTo: "/login" };

    authStore.isAuthenticated.mockReturnValue(false);
    router.parseUrl.mockReturnValue(loginUrlTree);

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(router.parseUrl).toHaveBeenCalledWith("/login");
    expect(result).toBe(loginUrlTree);
  });
});
