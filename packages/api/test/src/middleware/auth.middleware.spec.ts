import { beforeEach, describe, expect, it, vi } from "vitest";

const isRevokedMock = vi.hoisted(() => vi.fn());
const verifyAuthTokenMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/repositories/revoked-token.repository.js", () => ({
  RevokedTokenRepository: class {
    isRevoked = isRevokedMock;
  },
}));

vi.mock("../../../src/utils/jwt.js", () => ({
  verifyAuthToken: verifyAuthTokenMock,
}));

import { requireAuth } from "../../../src/middleware/auth.middleware.js";
import { AppError } from "../../../src/utils/app-error.js";

describe("requireAuth", () => {
  beforeEach(() => {
    isRevokedMock.mockReset();
    verifyAuthTokenMock.mockReset();
  });

  it("attaches auth metadata and calls next for a valid token", async () => {
    // given a request contains a valid bearer token
    const req = {
      header: vi.fn().mockReturnValue("Bearer token-123"),
    } as never;
    const next = vi.fn();

    verifyAuthTokenMock.mockReturnValue({
      sub: "user-1",
      jti: "token-1",
      exp: 1_900_000_000,
    });
    isRevokedMock.mockResolvedValue(false);

    // when authentication middleware verifies the request
    await requireAuth(req, {} as never, next);

    // then auth metadata is attached and the request continues
    expect(verifyAuthTokenMock).toHaveBeenCalledWith("token-123");
    expect(isRevokedMock).toHaveBeenCalledWith("token-1");
    expect((req as { authenticatedUserId?: string }).authenticatedUserId).toBe("user-1");
    expect((req as { authTokenJti?: string }).authTokenJti).toBe("token-1");
    expect((req as { authTokenExpiresAt?: Date }).authTokenExpiresAt).toEqual(new Date(1_900_000_000 * 1000));
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects missing bearer tokens", async () => {
    // given a request has no bearer token
    const next = vi.fn();

    // when authentication middleware handles the request
    await requireAuth({
      header: vi.fn().mockReturnValue(undefined),
    } as never, {} as never, next);

    // then an unauthorized error is forwarded
    expect(next).toHaveBeenCalledWith(new AppError(401, "Unauthorized"));
  });

  it("rejects tokens with incomplete payloads", async () => {
    // given a bearer token lacks required auth claims
    const next = vi.fn();

    verifyAuthTokenMock.mockReturnValue({
      sub: "user-1",
      jti: undefined,
      exp: 1_900_000_000,
    });

    // when authentication middleware verifies the token
    await requireAuth({
      header: vi.fn().mockReturnValue("Bearer token-123"),
    } as never, {} as never, next);

    // then an unauthorized error is forwarded
    expect(next).toHaveBeenCalledWith(new AppError(401, "Unauthorized"));
  });

  it("rejects revoked tokens", async () => {
    // given a bearer token has been revoked
    const next = vi.fn();

    verifyAuthTokenMock.mockReturnValue({
      sub: "user-1",
      jti: "token-1",
      exp: 1_900_000_000,
    });
    isRevokedMock.mockResolvedValue(true);

    // when authentication middleware verifies the token
    await requireAuth({
      header: vi.fn().mockReturnValue("Bearer token-123"),
    } as never, {} as never, next);

    // then an unauthorized error is forwarded
    expect(next).toHaveBeenCalledWith(new AppError(401, "Unauthorized"));
  });

  it("forwards verification failures to express error handling", async () => {
    // given token verification throws an error
    const next = vi.fn();
    const error = new Error("bad token");

    verifyAuthTokenMock.mockImplementation(() => {
      throw error;
    });

    // when authentication middleware handles the request
    await requireAuth({
      header: vi.fn().mockReturnValue("Bearer token-123"),
    } as never, {} as never, next);

    // then the verification error is forwarded unchanged
    expect(next).toHaveBeenCalledWith(error);
  });
});
