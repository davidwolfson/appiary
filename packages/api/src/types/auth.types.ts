import type { AuthenticatedUser } from "@appiary/types";

export interface RegisterAction {
  accountName: string;
  email: string;
  password: string;
}

export interface LoginAction {
  email: string;
  password: string;
}

export interface LogoutAction {
  jti: string;
  expiresAt: Date;
}

export interface AuthResult {
  user: AuthenticatedUser;
  token: string;
}

