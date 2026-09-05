import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DuplicateHiveNameError, HiveRepository } from "../../../src/repositories/hive.repository.js";
import { database } from "../../../src/utils/database.js";
import { runDatabaseMigrations } from "../../../src/utils/migrations.js";

describe("HiveRepository PostgreSQL integration", () => {
  const accountIds: string[] = [];
  const apiaryIdsByAccount = new Map<string, string>();

  beforeAll(async () => {
    await runDatabaseMigrations();
  });

  afterAll(async () => {
    if (accountIds.length > 0) {
      await database.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [accountIds]);
    }
    await database.close();
  });

  it("creates and maps a hive", async () => {
    // given an account and a uniquely named hive
    const repository = new HiveRepository();
    const accountId = await createAccount("Create hive account");
    const apiaryId = apiaryIdsByAccount.get(accountId)!;
    const name = `Created hive ${randomUUID()}`;

    // when the hive is created through the repository
    const created = await repository.create({ accountId, apiaryId, name, status: true });

    // then PostgreSQL columns and timestamps are mapped to the model
    expect(created).toMatchObject({ accountId, apiaryId, name, status: true });
    expect(created.hiveId).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
  });

  it("lists only the account hives in deterministic order", async () => {
    // given two same-time hives for one account and a hive for another account
    const repository = new HiveRepository();
    const ownerAccountId = await createAccount("List hive owner");
    const otherAccountId = await createAccount("List hive outsider");
    const orderedHiveIds = [randomUUID(), randomUUID()].sort();
    const createdAt = "2026-08-01T12:00:00Z";
    await insertHive(orderedHiveIds[1], ownerAccountId, "Second by UUID", true, createdAt);
    await insertHive(orderedHiveIds[0], ownerAccountId, "First by UUID", false, createdAt);
    const otherOwnerApiaryId = await createApiary(ownerAccountId, "Other owner apiary");
    const otherApiaryHiveId = randomUUID();
    await insertHive(otherApiaryHiveId, ownerAccountId, "Other apiary hive", true, createdAt, otherOwnerApiaryId);
    const foreignHiveId = randomUUID();
    await insertHive(foreignHiveId, otherAccountId, "Foreign hive", true, "2026-07-01T12:00:00Z");

    // when the owner's hives are listed
    const hives = await repository.findByAccountIdAndApiaryId(ownerAccountId, apiaryIdsByAccount.get(ownerAccountId)!);

    // then tenant scope and created-at/UUID ordering are enforced by PostgreSQL
    expect(hives.map(({ hiveId }) => hiveId)).toEqual(orderedHiveIds);
    expect(hives.map(({ name }) => name)).toEqual(["First by UUID", "Second by UUID"]);
    expect(hives.some(({ hiveId }) => hiveId === foreignHiveId)).toBe(false);
    expect(hives.some(({ hiveId }) => hiveId === otherApiaryHiveId)).toBe(false);
  });

  it("updates only an account-owned hive", async () => {
    // given a hive and a second account that does not own it
    const repository = new HiveRepository();
    const ownerAccountId = await createAccount("Update hive owner");
    const otherAccountId = await createAccount("Update hive outsider");
    const hiveId = await insertHive(randomUUID(), ownerAccountId, `Original ${randomUUID()}`, true);
    const ownerApiaryId = apiaryIdsByAccount.get(ownerAccountId)!;
    const reassignmentApiaryId = await createApiary(ownerAccountId, "Reassignment Apiary");

    // when the owner, another account, and a missing identifier are used for updates
    const updated = await repository.update({ accountId: ownerAccountId, hiveId, apiaryId: reassignmentApiaryId, name: "Updated hive", status: false });
    const foreignUpdate = await repository.update({ accountId: otherAccountId, hiveId, apiaryId: apiaryIdsByAccount.get(otherAccountId)!, name: "Stolen hive", status: true });
    const missingUpdate = await repository.update({ accountId: ownerAccountId, hiveId: randomUUID(), apiaryId: ownerApiaryId, name: "Missing hive", status: true });
    const persisted = await database.query<{ apiary_id: string; name: string; status: boolean }>(
      "SELECT apiary_id, name, status FROM hives WHERE hive_id = $1",
      [hiveId],
    );

    // then only the owner's update succeeds and the stored row is not mutated cross-account
    expect(updated).toMatchObject({ hiveId, accountId: ownerAccountId, apiaryId: reassignmentApiaryId, name: "Updated hive", status: false });
    expect(foreignUpdate).toBeNull();
    expect(missingUpdate).toBeNull();
    expect(persisted.rows[0]).toEqual({ apiary_id: reassignmentApiaryId, name: "Updated hive", status: false });
  });

  it("maps case-insensitive create and update conflicts", async () => {
    // given two accounts with a shared case-insensitive hive name
    const repository = new HiveRepository();
    const firstAccountId = await createAccount("Duplicate hive account");
    const secondAccountId = await createAccount("Allowed duplicate hive account");
    const marker = randomUUID();
    const firstApiaryId = apiaryIdsByAccount.get(firstAccountId)!;
    const secondApiaryId = apiaryIdsByAccount.get(secondAccountId)!;
    const first = await repository.create({ accountId: firstAccountId, apiaryId: firstApiaryId, name: `North ${marker}`, status: true });
    const updateCandidate = await repository.create({ accountId: firstAccountId, apiaryId: firstApiaryId, name: `South ${marker}`, status: true });

    // when case-varied duplicates are created and updated within and across accounts
    const [duplicateCreate, duplicateUpdate, crossAccountCreate] = await Promise.allSettled([
      repository.create({ accountId: firstAccountId, apiaryId: firstApiaryId, name: `nOrTh ${marker}`, status: false }),
      repository.update({
        accountId: firstAccountId,
        hiveId: updateCandidate.hiveId,
        apiaryId: firstApiaryId,
        name: `NORTH ${marker}`,
        status: false,
      }),
      repository.create({ accountId: secondAccountId, apiaryId: secondApiaryId, name: `NORTH ${marker}`, status: false }),
    ]);

    // then same-account conflicts use the domain error and another account may reuse the name
    expect(duplicateCreate).toMatchObject({ status: "rejected", reason: expect.any(DuplicateHiveNameError) });
    expect(duplicateUpdate).toMatchObject({ status: "rejected", reason: expect.any(DuplicateHiveNameError) });
    expect(crossAccountCreate).toMatchObject({
      status: "fulfilled",
      value: expect.objectContaining({ accountId: secondAccountId, name: `NORTH ${marker}` }),
    });
    const unchanged = await database.query<{ name: string }>("SELECT name FROM hives WHERE hive_id = $1", [updateCandidate.hiveId]);
    expect(unchanged.rows[0].name).toBe(`South ${marker}`);
    expect(first.name).toBe(`North ${marker}`);
  });

  async function createAccount(namePrefix: string): Promise<string> {
    const accountId = randomUUID();
    accountIds.push(accountId);
    await database.query("INSERT INTO accounts (id, name) VALUES ($1, $2)", [accountId, `${namePrefix} ${randomUUID()}`]);
    const apiary = await database.query<{ apiary_id: string }>(
      "INSERT INTO apiaries (account_id, name) VALUES ($1, 'Test Apiary') RETURNING apiary_id",
      [accountId],
    );
    apiaryIdsByAccount.set(accountId, apiary.rows[0].apiary_id);
    return accountId;
  }

  async function insertHive(
    hiveId: string,
    accountId: string,
    name: string,
    status: boolean,
    createdAt = "2026-08-01T12:00:00Z",
    selectedApiaryId?: string,
  ): Promise<string> {
    const apiaryId = selectedApiaryId ?? apiaryIdsByAccount.get(accountId);
    await database.query(
      `INSERT INTO hives (hive_id, account_id, apiary_id, name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [hiveId, accountId, apiaryId, name, status, createdAt],
    );
    return hiveId;
  }

  async function createApiary(accountId: string, name: string): Promise<string> {
    const result = await database.query<{ apiary_id: string }>(
      "INSERT INTO apiaries (account_id, name) VALUES ($1, $2) RETURNING apiary_id",
      [accountId, `${name} ${randomUUID()}`],
    );
    return result.rows[0].apiary_id;
  }
});
