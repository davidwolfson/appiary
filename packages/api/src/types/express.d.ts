declare global {
  namespace Express {
    interface Request {
      authenticatedUserId?: string;
      authTokenJti?: string;
      authTokenExpiresAt?: Date;
    }
  }
}

export {};

