import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { vi } from "vitest";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@appiary/types";
import { AuthApi } from "./auth.api";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let authApi: { login: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn>; register: ReturnType<typeof vi.fn> };
  const response: AuthResponse = { token: "token-123", user: { id: "user-1", email: "beekeeper@example.com", accountId: "account-1", accountName: "Apiary" } };

  beforeEach(() => {
    authApi = { login: vi.fn(), logout: vi.fn(), register: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), AuthService, { provide: AuthApi, useValue: authApi }] });
    globalThis.localStorage.setItem("appiary.auth.token", "legacy-token");
    service = TestBed.inject(AuthService);
  });

  it("removes a token left in browser storage by an older app version", () => {
    expect(globalThis.localStorage.getItem("appiary.auth.token")).toBeNull();
  });

  it("keeps the registration token in the current app instance", async () => {
    // given registration succeeds
    const payload = { accountName: "Apiary", email: "beekeeper@example.com", password: "secret123", confirmPassword: "secret123" } satisfies RegisterRequest;
    authApi.register.mockReturnValue(of(response));
    // when the user registers
    await service.register(payload);
    // then the returned token is available in memory
    expect(service.getToken()).toBe("token-123");
  });

  it("keeps the login token in the current app instance", async () => {
    // given login succeeds
    const payload = { email: "beekeeper@example.com", password: "secret123" } satisfies LoginRequest;
    authApi.login.mockReturnValue(of(response));
    // when the user logs in
    await service.login(payload);
    // then the token is available
    expect(service.getToken()).toBe("token-123");
  });

  it("clears the token when logout fails", async () => {
    // given an authenticated user and a failing logout request
    authApi.login.mockReturnValue(of(response));
    authApi.logout.mockReturnValue(throwError(() => new Error("logout failed")));
    await service.login({ email: "beekeeper@example.com", password: "secret123" });
    // when logout is attempted
    const result = service.logout();
    // then the failure propagates after local cleanup
    await expect(result).rejects.toThrow("logout failed");
    expect(service.getToken()).toBeNull();
  });

  it("clears the current token", async () => {
    // given a logged-in service
    authApi.login.mockReturnValue(of(response));
    await service.login({ email: "beekeeper@example.com", password: "secret123" });
    // when the session is cleared
    service.clearSession();
    // then no token remains
    expect(service.getToken()).toBeNull();
  });
});
