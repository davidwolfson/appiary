import { beforeEach, describe, expect, it, vi } from "vitest";

const isRevokedMock = vi.hoisted(() => vi.fn());
const verifyAuthTokenMock = vi.hoisted(() => vi.fn());

vi.mock("../src/repositories/revoked-token.repository.js", () => ({
  RevokedTokenRepository: class {
    isRevoked = isRevokedMock;
  },
}));

vi.mock("../src/utils/jwt.js", () => ({
  verifyAuthToken: verifyAuthTokenMock,
}));

import { requireAuth } from "../src/middleware/auth.middleware.js";
import { AppError } from "../src/utils/app-error.js";

describe("requireAuth", () => {
  beforeEach(() => {
    isRevokedMock.mockReset();
    verifyAuthTokenMock.mockReset();
  });

  it("attaches auth metadata and calls next for a valid token", async () => {
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

    await requireAuth(req, {} as never, next);

    expect(verifyAuthTokenMock).toHaveBeenCalledWith("token-123");
    expect(isRevokedMock).toHaveBeenCalledWith("token-1");
    expect((req as { authenticatedUserId?: string }).authenticatedUserId).toBe("user-1");
    expect((req as { authTokenJti?: string }).authTokenJti).toBe("token-1");
    expect((req as { authTokenExpiresAt?: Date }).authTokenExpiresAt).toEqual(new Date(1_900_000_000 * 1000));
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects missing bearer tokens", async () => {
    const next = vi.fn();

    await requireAuth({
      header: vi.fn().mockReturnValue(undefined),
    } as never, {} as never, next);

    expect(next).toHaveBeenCalledWith(new AppError(401, "Unauthorized"));
  });

  it("rejects tokens with incomplete payloads", async () => {
    const next = vi.fn();

    verifyAuthTokenMock.mockReturnValue({
      sub: "user-1",
      jti: undefined,
      exp: 1_900_000_000,
    });

    await requireAuth({
      header: vi.fn().mockReturnValue("Bearer token-123"),
    } as never, {} as never, next);

    expect(next).toHaveBeenCalledWith(new AppError(401, "Unauthorized"));
  });

  it("rejects revoked tokens", async () => {
    const next = vi.fn();

    verifyAuthTokenMock.mockReturnValue({
      sub: "user-1",
      jti: "token-1",
      exp: 1_900_000_000,
    });
    isRevokedMock.mockResolvedValue(true);

    await requireAuth({
      header: vi.fn().mockReturnValue("Bearer token-123"),
    } as never, {} as never, next);

    expect(next).toHaveBeenCalledWith(new AppError(401, "Unauthorized"));
  });

  it("forwards verification failures to express error handling", async () => {
    const next = vi.fn();
    const error = new Error("bad token");

    verifyAuthTokenMock.mockImplementation(() => {
      throw error;
    });

    await requireAuth({
      header: vi.fn().mockReturnValue("Bearer token-123"),
    } as never, {} as never, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
