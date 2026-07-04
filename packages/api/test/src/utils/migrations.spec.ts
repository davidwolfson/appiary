import { beforeEach, describe, expect, it, vi } from "vitest";

const readdirMock = vi.hoisted(() => vi.fn());
const readFileMock = vi.hoisted(() => vi.fn());
const queryMock = vi.hoisted(() => vi.fn());
const withTransactionMock = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => ({
  readdir: readdirMock,
  readFile: readFileMock,
}));

vi.mock("../../../src/utils/database.js", () => ({
  database: {
    withTransaction: withTransactionMock,
  },
}));

import { runDatabaseMigrations } from "../../../src/utils/migrations.js";

describe("runDatabaseMigrations", () => {
  beforeEach(() => {
    readdirMock.mockReset();
    readFileMock.mockReset();
    queryMock.mockReset();
    withTransactionMock.mockReset();

    queryMock.mockResolvedValue({ rows: [] });
    withTransactionMock.mockImplementation(async (callback: (client: { query: typeof queryMock }) => Promise<void>) => {
      await callback({ query: queryMock });
    });
  });

  it("applies pending migrations in filename order and records them", async () => {
    // given one migration is pending among sorted SQL files
    readdirMock.mockResolvedValue(["002_hives.sql", "notes.txt", "001_initial_auth.sql"]);
    readFileMock.mockImplementation(async (path: string) => {
      if (path.endsWith("001_initial_auth.sql")) {
        return "CREATE TABLE accounts";
      }

      if (path.endsWith("002_hives.sql")) {
        return "CREATE TABLE hives";
      }

      throw new Error(`Unexpected path ${path}`);
    });
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ filename: "001_initial_auth.sql" }] })
      .mockResolvedValue({ rows: [] });

    // when database migrations run
    await runDatabaseMigrations();

    // then only the pending migration is applied and recorded in order
    expect(queryMock).toHaveBeenNthCalledWith(1, "SELECT pg_advisory_xact_lock(481516, 2342)");
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining("CREATE TABLE IF NOT EXISTS schema_migrations"));
    expect(queryMock).toHaveBeenNthCalledWith(3, "SELECT filename FROM schema_migrations");
    expect(queryMock).toHaveBeenNthCalledWith(4, "CREATE TABLE hives");
    expect(queryMock).toHaveBeenNthCalledWith(5, "INSERT INTO schema_migrations (filename) VALUES ($1)", ["002_hives.sql"]);
  });

  it("does not apply migrations already recorded in schema_migrations", async () => {
    // given the discovered migration is already recorded
    readdirMock.mockResolvedValue(["001_initial_auth.sql"]);
    readFileMock.mockResolvedValue("CREATE TABLE accounts");
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ filename: "001_initial_auth.sql" }] });

    // when database migrations run
    await runDatabaseMigrations();

    // then the recorded migration is not read or applied again
    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(queryMock).not.toHaveBeenCalledWith("CREATE TABLE accounts");
    expect(queryMock).not.toHaveBeenCalledWith("INSERT INTO schema_migrations (filename) VALUES ($1)", ["001_initial_auth.sql"]);
  });
});
