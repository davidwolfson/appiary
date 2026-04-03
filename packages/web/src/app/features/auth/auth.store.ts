import { Injectable, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";

import type { LoginRequest, RegisterRequest } from "@appiary/types";

import type { AuthSession } from "./auth.mapper";
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
  private readonly router = inject(Router);

  private readonly sessionState = signal<AuthSession | null>(null);
  private readonly loadingState = signal(false);
  private readonly initializingState = signal(true);
  private readonly errorState = signal<string | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly isLoading = this.loadingState.asReadonly();
  readonly isInitializing = this.initializingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async initialize(): Promise<void> {
    const session = await this.authService.restoreSession();
    this.sessionState.set(session);
    this.initializingState.set(false);
  }

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
      this.sessionState.set(null);
      await this.router.navigateByUrl("/login");
    } catch (error) {
      this.errorState.set(extractErrorMessage(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  private async runAuthFlow(loadSession: () => Promise<AuthSession>): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const session = await loadSession();
      this.sessionState.set(session);
      await this.router.navigateByUrl("/");
    } catch (error) {
      this.errorState.set(extractErrorMessage(error));
      throw error;
    } finally {
      this.loadingState.set(false);
    }
  }
}

