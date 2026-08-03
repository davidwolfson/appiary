import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { vi } from "vitest";
import { AuthActivityService } from "./auth-activity.service";
import type { AuthSession } from "./auth.mapper";
import { AuthService } from "./auth.service";
import { AuthStore } from "./auth.store";

describe("AuthStore", () => {
  let store: AuthStore;
  let inactive: () => void;
  let authService: Record<"login" | "logout" | "register" | "clearSession" | "getToken", ReturnType<typeof vi.fn>>;
  let activity: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let router: { url: string; navigateByUrl: ReturnType<typeof vi.fn> };
  const session: AuthSession = { token: "token-123", user: { id: "user-1", email: "beekeeper@example.com", accountId: "account-1", accountName: "Apiary" } };

  beforeEach(() => {
    authService = { login: vi.fn(), logout: vi.fn(), register: vi.fn(), clearSession: vi.fn(), getToken: vi.fn().mockReturnValue(null) };
    activity = { start: vi.fn((callback: () => void) => { inactive = callback; }), stop: vi.fn() };
    router = { url: "/login", navigateByUrl: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), AuthStore, { provide: AuthService, useValue: authService }, { provide: AuthActivityService, useValue: activity }, { provide: Router, useValue: router }] });
    store = TestBed.inject(AuthStore);
  });

  it("starts activity monitoring after login", async () => {
    // given valid credentials resolve to a session
    authService.login.mockResolvedValue(session);
    // when login completes
    await store.login({ email: "beekeeper@example.com", password: "secret123" });
    // then the session is stored and monitoring starts
    expect(store.session()).toEqual(session);
    expect(activity.start).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith("/");
  });

  it("does not monitor a failed login", async () => {
    // given login fails
    authService.login.mockRejectedValue({ error: { message: "Invalid credentials" } });
    // when login is attempted
    const result = store.login({ email: "beekeeper@example.com", password: "wrong" });
    // then the error is exposed without monitoring
    await expect(result).rejects.toBeTruthy();
    expect(store.error()).toBe("Invalid credentials");
    expect(activity.start).not.toHaveBeenCalled();
  });

  it("invalidates and redirects when inactivity expires", async () => {
    // given a monitored authenticated session
    authService.login.mockResolvedValue(session);
    await store.login({ email: "beekeeper@example.com", password: "secret123" });
    router.url = "/";
    // when inactivity expires
    inactive();
    await Promise.resolve();
    // then all local session state is cleared
    expect(activity.stop).toHaveBeenCalled();
    expect(authService.clearSession).toHaveBeenCalled();
    expect(store.session()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenLastCalledWith("/login");
  });

  it("logs out locally even when server logout fails", async () => {
    // given an authenticated session whose logout request fails
    authService.login.mockResolvedValue(session);
    authService.logout.mockRejectedValue(new Error("logout failed"));
    await store.login({ email: "beekeeper@example.com", password: "secret123" });
    router.url = "/";
    // when logout is attempted
    await store.logout();
    // then local state is invalidated and login is shown
    expect(store.session()).toBeNull();
    expect(store.error()).toBe("Something went wrong");
    expect(router.navigateByUrl).toHaveBeenLastCalledWith("/login");
  });

  it("stops loading when the logout redirect fails", async () => {
    // given an authenticated session whose logout redirect will fail
    authService.login.mockResolvedValue(session);
    authService.logout.mockResolvedValue(undefined);
    await store.login({ email: "beekeeper@example.com", password: "secret123" });
    router.url = "/";
    router.navigateByUrl.mockRejectedValueOnce(new Error("navigation failed"));

    // when logout is attempted
    const result = store.logout();

    // then the navigation failure propagates after loading is reset
    await expect(result).rejects.toThrow("navigation failed");
    expect(store.isLoading()).toBe(false);
    expect(store.session()).toBeNull();
  });
});
