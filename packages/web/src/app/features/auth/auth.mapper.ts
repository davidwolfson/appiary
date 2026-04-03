import type { AuthResponse, AuthenticatedUser } from "@appiary/types";

export interface AuthSession {
  token: string;
  user: AuthenticatedUser;
}

export function mapToAuthSession(response: AuthResponse): AuthSession {
  return {
    token: response.token,
    user: response.user,
  };
}

export function mapToAuthenticatedSession(user: AuthenticatedUser, token: string): AuthSession {
  return {
    token,
    user,
  };
}
