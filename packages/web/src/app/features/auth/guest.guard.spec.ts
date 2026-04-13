import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { Router } from "@angular/router";
import { vi } from "vitest";

import { AuthStore } from "./auth.store";
import { guestGuard } from "./guest.guard";

describe("guestGuard", () => {
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

  it("allows navigation for unauthenticated users", () => {
    authStore.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it("redirects authenticated users to the home page", () => {
    const homeUrlTree = { redirectedTo: "/" };

    authStore.isAuthenticated.mockReturnValue(true);
    router.parseUrl.mockReturnValue(homeUrlTree);

    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));

    expect(router.parseUrl).toHaveBeenCalledWith("/");
    expect(result).toBe(homeUrlTree);
  });
});
