import { describe, expect, it } from "vitest";

import { assertSafeTestDatabase } from "../../../src/utils/test-database-safety.js";

describe("assertSafeTestDatabase", () => {
  it("accepts exactly appiary_test", () => {
    // given the canonical test database name
    const databaseName = "appiary_test";

    // when the test database is checked
    const checkDatabase = () => assertSafeTestDatabase(databaseName);

    // then the database is accepted
    expect(checkDatabase).not.toThrow();
  });

  it.each([
    undefined,
    "",
    "appiary",
    "Appiary_test",
    "appiary_tes",
    "appiary_test_backup",
  ])("rejects the unsafe database name %s", (databaseName) => {
    // given a database name other than the exact test database allowlist

    // when the test database is checked
    const checkDatabase = () => assertSafeTestDatabase(databaseName);

    // then the process is stopped with actionable guidance
    expect(checkDatabase).toThrow(/DB_NAME must be exactly "appiary_test"/);
  });
});
