import { Injectable, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";

import type { LoginRequest, RegisterRequest } from "@appiary/types";

import type { AuthSession } from "./auth.mapper";
import { AuthActivityService } from "./auth-activity.service";
import { AuthService } from "./auth.service";

function extractErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const apiError = (error as { error?: { message?: string } }).error;
    if (typeof apiError?.message === "string") {
      return apiError.message;
    }
  }

  return "Something went wrong";
}

@Injectable({ providedIn: "root" })
export class AuthStore {
  private readonly authService = inject(AuthService);
  private readonly authActivityService = inject(AuthActivityService);
  private readonly router = inject(Router);

  private readonly sessionState = signal<AuthSession | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly isLoading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async register(payload: RegisterRequest): Promise<void> {
    await this.runAuthFlow(() => this.authService.register(payload));
  }

  async login(payload: LoginRequest): Promise<void> {
    await this.runAuthFlow(() => this.authService.login(payload));
  }

  async logout(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      await this.authService.logout();
    } catch (error) {
      this.errorState.set(extractErrorMessage(error));
    } finally {
      try {
        await this.invalidateSession();
      } finally {
        this.loadingState.set(false);
      }
    }
  }

  async invalidateSession(): Promise<void> {
    const hadSession = this.sessionState() !== null || this.authService.getToken() !== null;
    this.authActivityService.stop();
    this.authService.clearSession();
    this.sessionState.set(null);
    if (hadSession || this.router.url !== "/login") {
      await this.router.navigateByUrl("/login");
    }
  }

  private async runAuthFlow(loadSession: () => Promise<AuthSession>): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const session = await loadSession();
      this.sessionState.set(session);
      this.authActivityService.start(() => void this.invalidateSession());
      await this.router.navigateByUrl("/");
    } catch (error) {
      this.errorState.set(extractErrorMessage(error));
      throw error;
    } finally {
      this.loadingState.set(false);
    }
  }
}

