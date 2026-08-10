import { afterEach, describe, expect, it, vi } from "vitest";

const poolMock = vi.hoisted(() => vi.fn());

vi.mock("pg", () => ({
  Pool: poolMock,
}));

describe("database initialization safety", () => {
  const originalNodeEnvironment = process.env.NODE_ENV;
  const originalDatabaseName = process.env.DB_NAME;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnvironment;
    process.env.DB_NAME = originalDatabaseName;
    vi.resetModules();
    poolMock.mockReset();
  });

  it("rejects an unsafe test database before constructing a pool", async () => {
    // given test mode is configured to use the development database
    process.env.NODE_ENV = "test";
    process.env.DB_NAME = "appiary";

    // when the database singleton module initializes
    const loadDatabase = import("../../../src/utils/database.js");

    // then environment validation stops initialization before pool construction
    await expect(loadDatabase).rejects.toThrow(/DB_NAME must be exactly "appiary_test"/);
    expect(poolMock).not.toHaveBeenCalled();
  });
});
