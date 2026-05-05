import { beforeEach, describe, expect, it, vi } from "vitest";

const hashMock = vi.hoisted(() => vi.fn());
const compareMock = vi.hoisted(() => vi.fn());
const withTransactionMock = vi.hoisted(() => vi.fn());
const signAuthTokenMock = vi.hoisted(() => vi.fn());

vi.mock("bcryptjs", () => ({
  default: {
    hash: hashMock,
    compare: compareMock,
  },
}));

vi.mock("../../../src/utils/database.js", () => ({
  database: {
    withTransaction: withTransactionMock,
  },
}));

vi.mock("../../../src/utils/jwt.js", () => ({
  signAuthToken: signAuthTokenMock,
}));

import { AuthService } from "../../../src/services/auth.service.js";
import { AppError } from "../../../src/utils/app-error.js";

describe("AuthService", () => {
  const accountRepository = {
    create: vi.fn(),
  };
  const userRepository = {
    create: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
  };
  const revokedTokenRepository = {
    create: vi.fn(),
  };

  beforeEach(() => {
    hashMock.mockReset();
    compareMock.mockReset();
    withTransactionMock.mockReset();
    signAuthTokenMock.mockReset();
    accountRepository.create.mockReset();
    userRepository.create.mockReset();
    userRepository.findByEmail.mockReset();
    userRepository.findById.mockReset();
    revokedTokenRepository.create.mockReset();
    signAuthTokenMock.mockReturnValue("signed-token");
  });

  function createService() {
    return new AuthService(
      accountRepository as never,
      userRepository as never,
      revokedTokenRepository as never,
    );
  }

  it("registers a new user through a transaction and returns an auth result", async () => {
    const service = createService();
    const client = { query: vi.fn() };

    userRepository.findByEmail.mockResolvedValue(null);
    hashMock.mockResolvedValue("hashed-password");
    accountRepository.create.mockResolvedValue({ id: "account-1" });
    userRepository.create.mockResolvedValue({ id: "user-1" });
    userRepository.findById.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      accountId: "account-1",
      accountName: "Acme",
    });
    withTransactionMock.mockImplementation(async (callback) => callback(client));

    const result = await service.register({
      accountName: "  Acme  ",
      email: "  User@Example.com  ",
      password: "password123",
    });

    expect(hashMock).toHaveBeenCalledWith("password123", 10);
    expect(accountRepository.create).toHaveBeenCalledWith("Acme", client);
    expect(userRepository.create).toHaveBeenCalledWith({
      accountId: "account-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
    }, client);
    expect(signAuthTokenMock).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({
      user: {
        id: "user-1",
        email: "user@example.com",
        accountId: "account-1",
        accountName: "Acme",
      },
      token: "signed-token",
    });
  });

  it("rejects registration when the email already exists", async () => {
    const service = createService();

    userRepository.findByEmail.mockResolvedValue({ id: "user-1" });

    await expect(service.register({
      accountName: "Acme",
      email: "user@example.com",
      password: "password123",
    })).rejects.toEqual(new AppError(409, "Email is already registered"));
  });

  it("throws when the registered user cannot be loaded after creation", async () => {
    const service = createService();

    userRepository.findByEmail.mockResolvedValue(null);
    hashMock.mockResolvedValue("hashed-password");
    accountRepository.create.mockResolvedValue({ id: "account-1" });
    userRepository.create.mockResolvedValue({ id: "user-1" });
    userRepository.findById.mockResolvedValue(null);
    withTransactionMock.mockImplementation(async (callback) => callback({ query: vi.fn() }));

    await expect(service.register({
      accountName: "Acme",
      email: "user@example.com",
      password: "password123",
    })).rejects.toEqual(new AppError(500, "Failed to load registered user"));
  });

  it("returns a token when login credentials are valid", async () => {
    const service = createService();

    userRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
      accountId: "account-1",
      accountName: "Acme",
    });
    compareMock.mockResolvedValue(true);

    const result = await service.login({
      email: "  User@Example.com  ",
      password: "password123",
    });

    expect(userRepository.findByEmail).toHaveBeenCalledWith("user@example.com");
    expect(compareMock).toHaveBeenCalledWith("password123", "hashed-password");
    expect(result.token).toBe("signed-token");
    expect(result.user.accountName).toBe("Acme");
  });

  it("rejects login when the user does not exist", async () => {
    const service = createService();

    userRepository.findByEmail.mockResolvedValue(null);

    await expect(service.login({
      email: "user@example.com",
      password: "password123",
    })).rejects.toEqual(new AppError(401, "Invalid email or password"));
  });

  it("rejects login when the password is invalid", async () => {
    const service = createService();

    userRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
      accountId: "account-1",
      accountName: "Acme",
    });
    compareMock.mockResolvedValue(false);

    await expect(service.login({
      email: "user@example.com",
      password: "wrong-password",
    })).rejects.toEqual(new AppError(401, "Invalid email or password"));
  });

  it("records revoked tokens on logout", async () => {
    const service = createService();

    await service.logout({
      jti: "token-1",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(revokedTokenRepository.create).toHaveBeenCalledWith({
      jti: "token-1",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  it("loads the authenticated user profile", async () => {
    const service = createService();

    userRepository.findById.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      accountId: "account-1",
      accountName: "Acme",
    });

    await expect(service.getAuthenticatedUser("user-1")).resolves.toEqual({
      id: "user-1",
      email: "user@example.com",
      accountId: "account-1",
      accountName: "Acme",
    });
  });

  it("rejects when the authenticated user cannot be found", async () => {
    const service = createService();

    userRepository.findById.mockResolvedValue(null);

    await expect(service.getAuthenticatedUser("missing-user")).rejects.toEqual(
      new AppError(401, "Unauthorized"),
    );
  });
});
