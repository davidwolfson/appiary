import type { NextFunction, Request, Response } from "express";

import { RevokedTokenRepository } from "../repositories/revoked-token.repository.js";
import { AppError } from "../utils/app-error.js";
import { verifyAuthToken } from "../utils/jwt.js";

const revokedTokenRepository = new RevokedTokenRepository();

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header("Authorization");

    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "Unauthorized");
    }

    const token = header.slice("Bearer ".length);
    const payload = verifyAuthToken(token);

    if (!payload.sub || !payload.jti || !payload.exp) {
      throw new AppError(401, "Unauthorized");
    }

    const isRevoked = await revokedTokenRepository.isRevoked(payload.jti);

    if (isRevoked) {
      throw new AppError(401, "Unauthorized");
    }

    req.authenticatedUserId = payload.sub;
    req.authTokenJti = payload.jti;
    req.authTokenExpiresAt = new Date(payload.exp * 1000);

    next();
  } catch (error) {
    next(error);
  }
}

