import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";

import type { LoginRequest, RegisterRequest } from "@appiary/types";

import { AuthApi } from "./auth.api";
import { mapToAuthenticatedSession, mapToAuthSession, type AuthSession } from "./auth.mapper";

const TOKEN_STORAGE_KEY = "appiary.auth.token";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly authApi = inject(AuthApi);

  async register(payload: RegisterRequest): Promise<AuthSession> {
    const response = await firstValueFrom(this.authApi.register(payload));
    const session = mapToAuthSession(response);

    this.persistToken(session.token);

    return session;
  }

  async login(payload: LoginRequest): Promise<AuthSession> {
    const response = await firstValueFrom(this.authApi.login(payload));
    const session = mapToAuthSession(response);

    this.persistToken(session.token);

    return session;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.authApi.logout());
    } finally {
      this.clearSession();
    }
  }

  async restoreSession(): Promise<AuthSession | null> {
    const token = this.getToken();

    if (!token) {
      return null;
    }

    try {
      const user = await firstValueFrom(this.authApi.getMe());
      return mapToAuthenticatedSession(user, token);
    } catch {
      this.clearSession();
      return null;
    }
  }

  getToken(): string | null {
    return globalThis.localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  clearSession(): void {
    globalThis.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  private persistToken(token: string): void {
    globalThis.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

