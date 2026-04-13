import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("../src/utils/database.js", () => ({
  database: {
    query: queryMock,
  },
}));

import { assertDatabaseSchema } from "../src/utils/schema.js";

describe("assertDatabaseSchema", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("does not throw when all required columns exist", async () => {
    queryMock.mockResolvedValue({
      rows: [
        { table_name: "accounts", column_name: "id" },
        { table_name: "accounts", column_name: "name" },
        { table_name: "accounts", column_name: "created_at" },
        { table_name: "accounts", column_name: "updated_at" },
        { table_name: "users", column_name: "id" },
        { table_name: "users", column_name: "account_id" },
        { table_name: "users", column_name: "email" },
        { table_name: "users", column_name: "password_hash" },
        { table_name: "users", column_name: "created_at" },
        { table_name: "users", column_name: "updated_at" },
        { table_name: "revoked_tokens", column_name: "jti" },
        { table_name: "revoked_tokens", column_name: "expires_at" },
        { table_name: "revoked_tokens", column_name: "created_at" },
      ],
    });

    await expect(assertDatabaseSchema()).resolves.toBeUndefined();
  });

  it("throws a helpful error when columns are missing", async () => {
    queryMock.mockResolvedValue({
      rows: [
        { table_name: "accounts", column_name: "id" },
        { table_name: "users", column_name: "id" },
        { table_name: "users", column_name: "account_id" },
        { table_name: "revoked_tokens", column_name: "jti" },
      ],
    });

    await expect(assertDatabaseSchema()).rejects.toThrow(
      "Database schema is out of date. Apply packages/api/db/schema.sql.",
    );
    await expect(assertDatabaseSchema()).rejects.toThrow("accounts: missing name, created_at, updated_at");
  });
});
