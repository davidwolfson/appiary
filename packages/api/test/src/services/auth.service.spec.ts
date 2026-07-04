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
    // given the email is available and repositories can create the account and user
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

    // when registration runs with padded account and email values
    const result = await service.register({
      accountName: "  Acme  ",
      email: "  User@Example.com  ",
      password: "password123",
    });

    // then the transaction uses normalized values and returns a signed auth result
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
    // given a user already owns the requested email
    const service = createService();

    userRepository.findByEmail.mockResolvedValue({ id: "user-1" });

    // when registration is attempted
    const result = service.register({
      accountName: "Acme",
      email: "user@example.com",
      password: "password123",
    });

    // then registration fails with an email conflict
    await expect(result).rejects.toEqual(new AppError(409, "Email is already registered"));
  });

  it("throws when the registered user cannot be loaded after creation", async () => {
    // given account and user creation succeeds but the user cannot be reloaded
    const service = createService();

    userRepository.findByEmail.mockResolvedValue(null);
    hashMock.mockResolvedValue("hashed-password");
    accountRepository.create.mockResolvedValue({ id: "account-1" });
    userRepository.create.mockResolvedValue({ id: "user-1" });
    userRepository.findById.mockResolvedValue(null);
    withTransactionMock.mockImplementation(async (callback) => callback({ query: vi.fn() }));

    // when registration is attempted
    const result = service.register({
      accountName: "Acme",
      email: "user@example.com",
      password: "password123",
    });

    // then registration fails instead of returning an incomplete auth result
    await expect(result).rejects.toEqual(new AppError(500, "Failed to load registered user"));
  });

  it("returns a token when login credentials are valid", async () => {
    // given the user exists and the password matches
    const service = createService();

    userRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
      accountId: "account-1",
      accountName: "Acme",
    });
    compareMock.mockResolvedValue(true);

    // when login is attempted with a padded email
    const result = await service.login({
      email: "  User@Example.com  ",
      password: "password123",
    });

    // then normalized credentials are checked and an auth result is returned
    expect(userRepository.findByEmail).toHaveBeenCalledWith("user@example.com");
    expect(compareMock).toHaveBeenCalledWith("password123", "hashed-password");
    expect(result.token).toBe("signed-token");
    expect(result.user.accountName).toBe("Acme");
  });

  it("rejects login when the user does not exist", async () => {
    // given no user exists for the submitted email
    const service = createService();

    userRepository.findByEmail.mockResolvedValue(null);

    // when login is attempted
    const result = service.login({
      email: "user@example.com",
      password: "password123",
    });

    // then login fails with an invalid-credentials error
    await expect(result).rejects.toEqual(new AppError(401, "Invalid email or password"));
  });

  it("rejects login when the password is invalid", async () => {
    // given the user exists but the password does not match
    const service = createService();

    userRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
      accountId: "account-1",
      accountName: "Acme",
    });
    compareMock.mockResolvedValue(false);

    // when login is attempted
    const result = service.login({
      email: "user@example.com",
      password: "wrong-password",
    });

    // then login fails with an invalid-credentials error
    await expect(result).rejects.toEqual(new AppError(401, "Invalid email or password"));
  });

  it("records revoked tokens on logout", async () => {
    // given an authenticated token has a JTI and expiry
    const service = createService();

    // when logout is requested
    await service.logout({
      jti: "token-1",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    // then the token is recorded as revoked
    expect(revokedTokenRepository.create).toHaveBeenCalledWith({
      jti: "token-1",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  it("loads the authenticated user profile", async () => {
    // given the authenticated user exists
    const service = createService();

    userRepository.findById.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      accountId: "account-1",
      accountName: "Acme",
    });

    // when the profile is requested
    const result = service.getAuthenticatedUser("user-1");

    // then the user's public profile is returned
    await expect(result).resolves.toEqual({
      id: "user-1",
      email: "user@example.com",
      accountId: "account-1",
      accountName: "Acme",
    });
  });

  it("rejects when the authenticated user cannot be found", async () => {
    // given the authenticated user no longer exists
    const service = createService();

    userRepository.findById.mockResolvedValue(null);

    // when the profile is requested
    const result = service.getAuthenticatedUser("missing-user");

    // then the request fails as unauthorized
    await expect(result).rejects.toEqual(new AppError(401, "Unauthorized"));
  });
});
