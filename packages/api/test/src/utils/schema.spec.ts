import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/utils/database.js", () => ({
  database: {
    query: queryMock,
  },
}));

import { assertDatabaseSchema } from "../../../src/utils/schema.js";

describe("assertDatabaseSchema", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("does not throw when all required columns exist", async () => {
    // given all required database columns exist
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
        { table_name: "apiaries", column_name: "apiary_id" },
        { table_name: "apiaries", column_name: "account_id" },
        { table_name: "apiaries", column_name: "name" },
        { table_name: "apiaries", column_name: "status" },
        { table_name: "apiaries", column_name: "created_at" },
        { table_name: "apiaries", column_name: "updated_at" },
        { table_name: "hives", column_name: "hive_id" },
        { table_name: "hives", column_name: "account_id" },
        { table_name: "hives", column_name: "apiary_id" },
        { table_name: "hives", column_name: "status" },
        { table_name: "hives", column_name: "name" },
        { table_name: "hives", column_name: "created_at" },
        { table_name: "hives", column_name: "updated_at" },
        { table_name: "hive_inspections", column_name: "inspection_id" },
        { table_name: "hive_inspections", column_name: "hive_id" },
        { table_name: "hive_inspections", column_name: "inspection_date" },
        { table_name: "hive_inspections", column_name: "inspection_time" },
        { table_name: "hive_inspections", column_name: "queen_right" },
        { table_name: "hive_inspections", column_name: "eggs" },
        { table_name: "hive_inspections", column_name: "larva" },
        { table_name: "hive_inspections", column_name: "capped_brood" },
        { table_name: "hive_inspections", column_name: "brood_pattern" },
        { table_name: "hive_inspections", column_name: "additional_notes" },
        { table_name: "hive_inspections", column_name: "created_at" },
        { table_name: "hive_inspections", column_name: "updated_at" },
      ],
    });

    // when the schema is checked
    const result = assertDatabaseSchema();

    // then the check succeeds
    await expect(result).resolves.toBeUndefined();
  });

  it("throws a helpful error when columns are missing", async () => {
    // given required database columns are missing
    queryMock.mockResolvedValue({
      rows: [
        { table_name: "accounts", column_name: "id" },
        { table_name: "users", column_name: "id" },
        { table_name: "users", column_name: "account_id" },
        { table_name: "revoked_tokens", column_name: "jti" },
      ],
    });

    // when the schema is checked
    const error = await assertDatabaseSchema().catch((caught: unknown) => caught);

    // then the error identifies the missing schema
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(
      "Database schema is out of date after running migrations. Check packages/api/db/migrations.",
    );
    expect((error as Error).message).toContain("accounts: missing name, created_at, updated_at");
    expect((error as Error).message).toContain(
      "hives: missing hive_id, account_id, apiary_id, status, name, created_at, updated_at",
    );
  });
});
