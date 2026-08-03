import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

import type { AuthResponse, LoginRequest, RegisterRequest } from "@appiary/types";

import { apiConfig } from "../../core/api/api.config";

@Injectable({ providedIn: "root" })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${apiConfig.baseUrl}/auth`;

  register(payload: RegisterRequest) {
    return this.http.post<AuthResponse>(`${this.authUrl}/register`, payload);
  }

  login(payload: LoginRequest) {
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, payload);
  }

  logout() {
    return this.http.post<void>(`${this.authUrl}/logout`, {});
  }
}

