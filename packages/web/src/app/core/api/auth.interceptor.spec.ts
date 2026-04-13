import { HttpErrorResponse, HttpRequest, HttpResponse } from "@angular/common/http";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { lastValueFrom, of, throwError } from "rxjs";
import { vi } from "vitest";

import { AuthService } from "../../features/auth/auth.service";
import { authInterceptor } from "./auth.interceptor";

describe("authInterceptor", () => {
  let authService: {
    clearSession: ReturnType<typeof vi.fn>;
    getToken: ReturnType<typeof vi.fn>;
  };
  let router: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authService = {
      clearSession: vi.fn(),
      getToken: vi.fn(),
    };

    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it("adds an authorization header when a token exists", async () => {
    const request = new HttpRequest("GET", "/api/auth/me");
    let authorizedRequest: HttpRequest<unknown> | undefined;
    const next = vi.fn((interceptedRequest: HttpRequest<unknown>) => {
      authorizedRequest = interceptedRequest;
      return of(new HttpResponse({ status: 200 }));
    });

    authService.getToken.mockReturnValue("token-123");

    await lastValueFrom(TestBed.runInInjectionContext(() => authInterceptor(request, next)));

    expect(next).toHaveBeenCalled();
    expect(authorizedRequest?.headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("passes the request through unchanged when no token exists", async () => {
    const request = new HttpRequest("GET", "/api/auth/me");
    let forwardedRequest: HttpRequest<unknown> | undefined;
    const next = vi.fn((interceptedRequest: HttpRequest<unknown>) => {
      forwardedRequest = interceptedRequest;
      return of(new HttpResponse({ status: 200 }));
    });

    authService.getToken.mockReturnValue(null);

    await lastValueFrom(TestBed.runInInjectionContext(() => authInterceptor(request, next)));

    expect(forwardedRequest).toBe(request);
    expect(forwardedRequest?.headers.has("Authorization")).toBe(false);
  });

  it("clears the session and redirects to login on 401 responses", async () => {
    const request = new HttpRequest("GET", "/api/auth/me");
    const unauthorizedError = new HttpErrorResponse({
      status: 401,
      statusText: "Unauthorized",
      url: "/api/auth/me",
    });
    const next = vi.fn(() => throwError(() => unauthorizedError));

    authService.getToken.mockReturnValue("token-123");

    await expect(
      lastValueFrom(TestBed.runInInjectionContext(() => authInterceptor(request, next))),
    ).rejects.toBe(unauthorizedError);

    expect(authService.clearSession).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith("/login");
  });

  it("does not redirect on non-401 responses", async () => {
    const request = new HttpRequest("GET", "/api/auth/me");
    const serverError = new HttpErrorResponse({
      status: 500,
      statusText: "Server Error",
      url: "/api/auth/me",
    });
    const next = vi.fn(() => throwError(() => serverError));

    authService.getToken.mockReturnValue("token-123");

    await expect(
      lastValueFrom(TestBed.runInInjectionContext(() => authInterceptor(request, next))),
    ).rejects.toBe(serverError);

    expect(authService.clearSession).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
