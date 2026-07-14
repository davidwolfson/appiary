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

  it("updates a hive to changed values scoped by account id and hive id", async () => {
    // given an existing hive would be changed from North Field/true to South Field/false
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-03T00:00:00.000Z");
    const existingHive = {
      hiveId: "hive-1",
      accountId: "account-1",
      name: "North Field",
      status: true,
    };
    const updatePayload = {
      name: "South Field",
      status: false,
    };
    const repository = new HiveRepository();

    queryMock.mockResolvedValue({
      rows: [{
        hive_id: existingHive.hiveId,
        account_id: existingHive.accountId,
        name: updatePayload.name,
        status: updatePayload.status,
        created_at: createdAt,
        updated_at: updatedAt,
      }],
    });

    // when the repository updates the hive
    const result = repository.update({
      accountId: existingHive.accountId,
      hiveId: existingHive.hiveId,
      name: updatePayload.name,
      status: updatePayload.status,
    });

    // then the changed values are written through the scoped update and returned
    await expect(result).resolves.toEqual({
      hiveId: existingHive.hiveId,
      accountId: existingHive.accountId,
      name: updatePayload.name,
      status: updatePayload.status,
      createdAt,
      updatedAt,
    });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE account_id = $1"),
      [existingHive.accountId, existingHive.hiveId, updatePayload.name, updatePayload.status],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("AND hive_id = $2"),
      [existingHive.accountId, existingHive.hiveId, updatePayload.name, updatePayload.status],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("updated_at = NOW()"),
      [existingHive.accountId, existingHive.hiveId, updatePayload.name, updatePayload.status],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET name = $3"),
      [existingHive.accountId, existingHive.hiveId, updatePayload.name, updatePayload.status],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("status = $4"),
      [existingHive.accountId, existingHive.hiveId, updatePayload.name, updatePayload.status],
    );
  });

  it("returns null when no scoped hive is updated", async () => {
    // given the database does not update a hive
    const repository = new HiveRepository();

    queryMock.mockResolvedValue({ rows: [] });

    // when the repository updates a missing hive
    const result = repository.update({
      accountId: "account-1",
      hiveId: "missing-hive",
      name: "South Field",
      status: false,
    });

    // then null is returned
    await expect(result).resolves.toBeNull();
  });

  it("maps update unique violations to duplicate hive name repository errors", async () => {
    // given the database reports a unique-name violation during update
    const repository = new HiveRepository();

    queryMock.mockRejectedValue({ code: "23505" });

    // when the repository updates the hive
    const result = repository.update({
      accountId: "account-1",
      hiveId: "hive-1",
      name: "South Field",
      status: true,
    });

    // then a duplicate-name repository error is returned
    await expect(result).rejects.toEqual(new DuplicateHiveNameError());
  });
});
