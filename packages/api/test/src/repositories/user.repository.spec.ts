import { beforeEach, describe, expect, it, vi } from "vitest";

import { DuplicateUserEmailError, UserRepository } from "../../../src/repositories/user.repository.js";
import type { Queryable } from "../../../src/utils/database.js";

describe("UserRepository", () => {
  const queryMock = vi.fn();
  const client = { query: queryMock } as Queryable;

  beforeEach(() => {
    queryMock.mockReset();
  });

  it("inserts and maps a user", async () => {
    // given a transaction client returns an inserted user row
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");
    const repository = new UserRepository();

    queryMock.mockResolvedValue({
      rows: [{
        id: "user-1",
        account_id: "account-1",
        email: "user@example.com",
        password_hash: "hashed-password",
        created_at: createdAt,
        updated_at: updatedAt,
      }],
    });

    // when the repository creates the user
    const result = repository.create({
      accountId: "account-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
    }, client);

    // then the insert parameters and mapped user are returned
    await expect(result).resolves.toEqual({
      id: "user-1",
      accountId: "account-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
      createdAt,
      updatedAt,
    });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO users"), [
      "account-1",
      "user@example.com",
      "hashed-password",
    ]);
  });

  it("maps the email constraint violation", async () => {
    // given PostgreSQL reports the users email unique constraint
    const repository = new UserRepository();

    queryMock.mockRejectedValue({ code: "23505", constraint: "users_email_key" });

    // when the repository creates the duplicate user
    const result = repository.create({
      accountId: "account-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
    }, client);

    // then a typed duplicate email error is returned
    await expect(result).rejects.toEqual(new DuplicateUserEmailError());
  });

  it("preserves another unique constraint violation", async () => {
    // given PostgreSQL reports a different unique constraint
    const repository = new UserRepository();
    const databaseError = { code: "23505", constraint: "users_pkey" };

    queryMock.mockRejectedValue(databaseError);

    // when the repository creates the user
    const result = repository.create({
      accountId: "account-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
    }, client);

    // then the original unique violation is preserved
    await expect(result).rejects.toBe(databaseError);
  });

  it("preserves a non-unique database failure", async () => {
    // given PostgreSQL reports a non-unique failure
    const repository = new UserRepository();
    const databaseError = { code: "08006" };

    queryMock.mockRejectedValue(databaseError);

    // when the repository creates the user
    const result = repository.create({
      accountId: "account-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
    }, client);

    // then the original database failure is preserved
    await expect(result).rejects.toBe(databaseError);
  });
});
