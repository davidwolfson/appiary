import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/utils/database.js", () => ({
  database: {
    query: queryMock,
  },
}));

import { DuplicateHiveNameError, HiveRepository } from "../../../src/repositories/hive.repository.js";

describe("HiveRepository", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("inserts and maps a hive", async () => {
    // given the database returns an inserted hive row
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");
    const repository = new HiveRepository();

    queryMock.mockResolvedValue({
      rows: [{
        hive_id: "hive-1",
        account_id: "account-1",
        name: "North Field",
        status: true,
        created_at: createdAt,
        updated_at: updatedAt,
      }],
    });

    // when the repository creates the hive
    const result = repository.create({
      accountId: "account-1",
      name: "North Field",
      status: true,
    });

    // then the insert parameters and mapped hive are returned
    await expect(result).resolves.toEqual({
      hiveId: "hive-1",
      accountId: "account-1",
      name: "North Field",
      status: true,
      createdAt,
      updatedAt,
    });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO hives"), [
      "account-1",
      "North Field",
      true,
    ]);
  });

  it("maps unique violations to duplicate hive name repository errors", async () => {
    // given the database reports a unique-name violation
    const repository = new HiveRepository();

    queryMock.mockRejectedValue({ code: "23505" });

    // when the repository creates the hive
    const result = repository.create({
      accountId: "account-1",
      name: "North Field",
      status: true,
    });

    // then a duplicate-name repository error is returned
    await expect(result).rejects.toEqual(new DuplicateHiveNameError());
  });

  it("retrieves hives by account id", async () => {
    // given the database contains hives for an account
    const repository = new HiveRepository();

    queryMock.mockResolvedValue({
      rows: [{
        hive_id: "hive-1",
        account_id: "account-1",
        name: "North Field",
        status: false,
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-02T00:00:00.000Z"),
      }],
    });

    // when the repository lists that account's hives
    const result = await repository.findByAccountId("account-1");

    // then the query is scoped and rows are mapped
    expect(result[0]).toMatchObject({
      hiveId: "hive-1",
      accountId: "account-1",
      name: "North Field",
      status: false,
    });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("WHERE account_id = $1"), ["account-1"]);
  });
});
