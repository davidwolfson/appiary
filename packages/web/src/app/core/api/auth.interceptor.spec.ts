import { HttpErrorResponse, HttpRequest, HttpResponse } from "@angular/common/http";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { lastValueFrom, of, throwError } from "rxjs";
import { vi } from "vitest";

import { AuthService } from "../../features/auth/auth.service";
import { AuthStore } from "../../features/auth/auth.store";
import { authInterceptor } from "./auth.interceptor";

describe("authInterceptor", () => {
  let authService: {
    getToken: ReturnType<typeof vi.fn>;
  };
  let authStore: {
    invalidateSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authService = {
      getToken: vi.fn(),
    };

    authStore = {
      invalidateSession: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authService },
        { provide: AuthStore, useValue: authStore },
      ],
    });
  });

  it("adds an authorization header when a token exists", async () => {
    // given the session contains an auth token
    const request = new HttpRequest("GET", "/api/auth/me");
    let authorizedRequest: HttpRequest<unknown> | undefined;
    const next = vi.fn((interceptedRequest: HttpRequest<unknown>) => {
      authorizedRequest = interceptedRequest;
      return of(new HttpResponse({ status: 200 }));
    });

    authService.getToken.mockReturnValue("token-123");

    // when the interceptor handles an API request
    await lastValueFrom(TestBed.runInInjectionContext(() => authInterceptor(request, next)));

    // then the forwarded request contains the bearer token
    expect(next).toHaveBeenCalled();
    expect(authorizedRequest?.headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("passes the request through unchanged when no token exists", async () => {
    // given the session has no auth token
    const request = new HttpRequest("GET", "/api/auth/me");
    let forwardedRequest: HttpRequest<unknown> | undefined;
    const next = vi.fn((interceptedRequest: HttpRequest<unknown>) => {
      forwardedRequest = interceptedRequest;
      return of(new HttpResponse({ status: 200 }));
    });

    authService.getToken.mockReturnValue(null);

    // when the interceptor handles an API request
    await lastValueFrom(TestBed.runInInjectionContext(() => authInterceptor(request, next)));

    // then the original request is forwarded without authorization
    expect(forwardedRequest).toBe(request);
    expect(forwardedRequest?.headers.has("Authorization")).toBe(false);
  });

  it("clears the session and redirects to login on 401 responses", async () => {
    // given an authenticated API request receives a 401 response
    const request = new HttpRequest("GET", "/api/auth/me");
    const unauthorizedError = new HttpErrorResponse({
      status: 401,
      statusText: "Unauthorized",
      url: "/api/auth/me",
    });
    const next = vi.fn(() => throwError(() => unauthorizedError));

    authService.getToken.mockReturnValue("token-123");

    // when the interceptor handles the response error
    const result = lastValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(request, next)),
    );

    // then the session is cleared and navigation goes to login
    await expect(result).rejects.toBe(unauthorizedError);

    expect(authStore.invalidateSession).toHaveBeenCalled();
  });

  it("does not redirect on non-401 responses", async () => {
    // given an authenticated API request receives a 500 response
    const request = new HttpRequest("GET", "/api/auth/me");
    const serverError = new HttpErrorResponse({
      status: 500,
      statusText: "Server Error",
      url: "/api/auth/me",
    });
    const next = vi.fn(() => throwError(() => serverError));

    authService.getToken.mockReturnValue("token-123");

    // when the interceptor handles the response error
    const result = lastValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(request, next)),
    );

    // then the error propagates without clearing or redirecting
    await expect(result).rejects.toBe(serverError);

    expect(authStore.invalidateSession).not.toHaveBeenCalled();
  });
});
