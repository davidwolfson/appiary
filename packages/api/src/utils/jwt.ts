import crypto from "node:crypto";

import jwt, { type JwtPayload } from "jsonwebtoken";

import { env } from "./env.js";

const TOKEN_EXPIRES_IN = "7d";

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  jti: string;
}

export function signAuthToken(userId: string): string {
  return jwt.sign(
    {},
    env.JWT_SECRET,
    {
      subject: userId,
      jwtid: crypto.randomUUID(),
      expiresIn: TOKEN_EXPIRES_IN,
    },
  );
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
