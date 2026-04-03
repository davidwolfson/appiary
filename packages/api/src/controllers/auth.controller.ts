import { Router } from "express";

import type { AuthResponse } from "@appiary/types";

import { requireAuth } from "../middleware/auth.middleware.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { RevokedTokenRepository } from "../repositories/revoked-token.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { LoginRequestSchema, RegisterRequestSchema } from "../schemas/auth.schemas.js";
import { AuthService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const authService = new AuthService(
  new AccountRepository(),
  new UserRepository(),
  new RevokedTokenRepository(),
);

function mapToAuthResponse(result: AuthResponse): AuthResponse {
  return {
    user: result.user,
    token: result.token,
  };
}

export const authRouter = Router();

authRouter.post("/register", asyncHandler(async (req, res) => {
  const input = RegisterRequestSchema.parse(req.body);

  const result = await authService.register({
    accountName: input.accountName,
    email: input.email,
    password: input.password,
  });

  res.status(201).json(mapToAuthResponse(result));
}));

authRouter.post("/login", asyncHandler(async (req, res) => {
  const input = LoginRequestSchema.parse(req.body);

  const result = await authService.login(input);

  res.status(200).json(mapToAuthResponse(result));
}));

authRouter.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  await authService.logout({
    jti: req.authTokenJti!,
    expiresAt: req.authTokenExpiresAt!,
  });

  res.status(204).send();
}));

authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const result = await authService.getAuthenticatedUser(req.authenticatedUserId!);

  res.status(200).json(result);
}));
