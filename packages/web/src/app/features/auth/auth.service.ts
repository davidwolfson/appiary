import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";

import type { LoginRequest, RegisterRequest } from "@appiary/types";

import { AuthApi } from "./auth.api";
import { mapToAuthSession, type AuthSession } from "./auth.mapper";

const LEGACY_TOKEN_STORAGE_KEY = "appiary.auth.token";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly authApi = inject(AuthApi);
  private token: string | null = null;

  constructor() {
    globalThis.localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  }

  async register(payload: RegisterRequest): Promise<AuthSession> {
    const response = await firstValueFrom(this.authApi.register(payload));
    const session = mapToAuthSession(response);

    this.token = session.token;

    return session;
  }

  async login(payload: LoginRequest): Promise<AuthSession> {
    const response = await firstValueFrom(this.authApi.login(payload));
    const session = mapToAuthSession(response);

    this.token = session.token;

    return session;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.authApi.logout());
    } finally {
      this.clearSession();
    }
  }

  getToken(): string | null {
    return this.token;
  }

  clearSession(): void {
    this.token = null;
  }
}

