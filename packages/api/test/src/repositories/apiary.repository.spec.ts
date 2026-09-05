import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/utils/database.js", () => ({
  database: { query: queryMock },
}));

import {
  ApiaryRepository,
  DuplicateApiaryNameError,
} from "../../../src/repositories/apiary.repository.js";

describe("ApiaryRepository", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("creates an active-by-default apiary and maps its row", async () => {
    // given PostgreSQL returns an apiary created with database defaults
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-01T00:00:00.000Z");
    queryMock.mockResolvedValue({ rows: [{
      apiary_id: "apiary-1",
      account_id: "account-1",
      name: "North Yard",
      status: true,
      created_at: createdAt,
      updated_at: updatedAt,
    }] });
    const repository = new ApiaryRepository();

    // when the apiary is created
    const result = repository.create({ accountId: "account-1", name: "North Yard" });

    // then only account and name are inserted and all model fields are mapped
    await expect(result).resolves.toEqual({
      apiaryId: "apiary-1",
      accountId: "account-1",
      name: "North Yard",
      status: true,
      createdAt,
      updatedAt,
    });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO apiaries (account_id, name)"), [
      "account-1",
      "North Yard",
    ]);
  });

  it("lists account apiaries in ID order", async () => {
    // given the database returns apiaries for one account
    queryMock.mockResolvedValue({ rows: [] });
    const repository = new ApiaryRepository();

    // when the account apiaries are listed
    await repository.findByAccountId("account-1");

    // then the query is account-scoped and deterministically ordered
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("WHERE account_id = $1"), ["account-1"]);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("ORDER BY apiary_id ASC"), ["account-1"]);
  });

  it("finds an apiary only within its account", async () => {
    // given the database returns an owned apiary followed by no matching apiary
    const row = {
      apiary_id: "apiary-1", account_id: "account-1", name: "North Yard", status: true,
      created_at: new Date(), updated_at: new Date(),
    };
    queryMock.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] });
    const repository = new ApiaryRepository();

    // when owned and missing apiaries are looked up within the account
    const ownedApiary = await repository.findByAccountIdAndApiaryId("account-1", "apiary-1");
    const missingApiary = await repository.findByAccountIdAndApiaryId("account-1", "missing-apiary");

    // then the lookup is account-scoped and only the owned apiary is returned
    expect(ownedApiary).toMatchObject({ apiaryId: "apiary-1", accountId: "account-1" });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("AND apiary_id = $2"), ["account-1", "apiary-1"]);
    expect(missingApiary).toBeNull();
  });

  it("maps only the named apiary-name constraint to a duplicate error", async () => {
    // given PostgreSQL reports the account/name unique-index violation
    queryMock.mockRejectedValue({ code: "23505", constraint: "apiaries_account_id_lower_name_key" });
    const repository = new ApiaryRepository();

    // when an apiary with that name is created
    const result = repository.create({ accountId: "account-1", name: "North Yard" });

    // then the stable repository error is returned
    await expect(result).rejects.toEqual(new DuplicateApiaryNameError());
  });

  it("preserves unrelated database errors", async () => {
    // given PostgreSQL reports a different unique constraint
    const databaseError = { code: "23505", constraint: "some_other_constraint" };
    queryMock.mockRejectedValue(databaseError);
    const repository = new ApiaryRepository();

    // when apiary creation fails
    const result = repository.create({ accountId: "account-1", name: "North Yard" });

    // then the original error is not mislabeled as a name conflict
    await expect(result).rejects.toBe(databaseError);
  });
});
