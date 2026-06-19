export interface RegisterRequest {
  accountName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  accountId: string;
  accountName: string;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  token: string;
}
