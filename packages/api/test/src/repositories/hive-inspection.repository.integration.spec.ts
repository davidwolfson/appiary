import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { HiveInspectionRepository } from "../../../src/repositories/hive-inspection.repository.js";
import { database } from "../../../src/utils/database.js";
import { runDatabaseMigrations } from "../../../src/utils/migrations.js";

describe("HiveInspectionRepository PostgreSQL integration", () => {
  const accountIds: string[] = [];

  beforeAll(async () => {
    await runDatabaseMigrations();
  });

  afterAll(async () => {
    if (accountIds.length > 0) {
      await database.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [accountIds]);
    }
    await database.close();
  });

  it("inserts only for an account-owned hive and maps PostgreSQL values", async () => {
    // given two accounts and a hive owned by the first account
    const repository = new HiveInspectionRepository();
    const ownerAccountId = await createAccount("Inspection owner");
    const otherAccountId = await createAccount("Other inspection account");
    const hiveId = await createHive(ownerAccountId, "Owned hive");

    // when both accounts try to create an inspection for the hive
    const created = await repository.createForAccount({
      accountId: ownerAccountId,
      hiveId,
      inspectionDate: "2026-07-31",
      inspectionTime: "14:30",
      queenRight: true,
      eggs: false,
      larva: true,
      cappedBrood: false,
      broodPattern: "fair",
      additionalNotes: "Calm colony",
    });
    const rejected = await repository.createForAccount({
      accountId: otherAccountId,
      hiveId,
      inspectionDate: "2026-07-31",
      inspectionTime: "15:30",
      queenRight: false,
      eggs: false,
      larva: false,
      cappedBrood: false,
      broodPattern: null,
      additionalNotes: null,
    });

    // then the owned insert is mapped and the foreign-account insert creates no row
    expect(created).toMatchObject({
      hiveId,
      inspectionDate: "2026-07-31",
      inspectionTime: "14:30",
      broodPattern: "fair",
    });
    expect(created?.createdAt).toBeInstanceOf(Date);
    expect(rejected).toBeNull();
    const count = await database.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM hive_inspections WHERE hive_id = $1",
      [hiveId],
    );
    expect(count.rows[0].count).toBe("1");
  });

  it("returns complete histories per hive with deterministic tie ordering", async () => {
    // given two populated hives, one empty hive, and tied inspection timestamps
    const repository = new HiveInspectionRepository();
    const accountId = await createAccount("Inspection history account");
    const firstHiveId = await createHive(accountId, "First history hive");
    const secondHiveId = await createHive(accountId, "Second history hive");
    const emptyHiveId = await createHive(accountId, "Empty history hive");
    const tiedInspectionIds = [randomUUID(), randomUUID()].sort();
    const firstHiveRows = [
      { id: randomUUID(), date: "2026-07-25", time: "09:00", createdAt: "2026-07-25T13:00:00Z" },
      { id: randomUUID(), date: "2026-07-26", time: "09:00", createdAt: "2026-07-26T13:00:00Z" },
      { id: randomUUID(), date: "2026-07-27", time: "09:00", createdAt: "2026-07-27T13:00:00Z" },
      { id: randomUUID(), date: "2026-07-28", time: "09:00", createdAt: "2026-07-28T13:00:00Z" },
      { id: randomUUID(), date: "2026-07-29", time: "09:00", createdAt: "2026-07-29T13:00:00Z" },
      { id: tiedInspectionIds[0], date: "2026-07-30", time: "09:00", createdAt: "2026-07-30T13:00:00Z" },
      { id: tiedInspectionIds[1], date: "2026-07-30", time: "09:00", createdAt: "2026-07-30T13:00:00Z" },
    ];
    for (const row of firstHiveRows) {
      await insertInspection(firstHiveId, row.id, row.date, row.time, row.createdAt);
    }
    const secondHiveInspectionId = randomUUID();
    await insertInspection(secondHiveId, secondHiveInspectionId, "2026-07-20", "08:15", "2026-07-20T12:15:00Z");

    // when histories are retrieved in one repository call
    const histories = await repository.findFirstPageForHiveIds([firstHiveId, secondHiveId, emptyHiveId]);

    // then each hive has a bounded first page and ties use descending UUID order
    expect(histories.get(firstHiveId)?.inspections).toHaveLength(5);
    expect(histories.get(firstHiveId)?.totalItems).toBe(7);
    expect(histories.get(firstHiveId)?.inspections.slice(0, 2).map(({ inspectionId }) => inspectionId))
      .toEqual([...tiedInspectionIds].reverse());
    expect(histories.get(firstHiveId)?.inspections.map(({ inspectionDate }) => inspectionDate))
      .toEqual(["2026-07-30", "2026-07-30", "2026-07-29", "2026-07-28", "2026-07-27"]);
    expect(histories.get(secondHiveId)?.inspections.map(({ inspectionId }) => inspectionId))
      .toEqual([secondHiveInspectionId]);
    expect(histories.get(emptyHiveId)).toEqual({ inspections: [], totalItems: 0 });
  });

  it("pages an owned history with stable ordering and a full count", async () => {
    // given an owned hive with seven deliberately ordered inspections
    const repository = new HiveInspectionRepository();
    const accountId = await createAccount("Paged inspection account");
    const hiveId = await createHive(accountId, "Paged inspection hive");
    const tiedInspectionIds = [randomUUID(), randomUUID()].sort();
    const rows = [
      { id: randomUUID(), date: "2026-08-01", time: "08:00", createdAt: "2026-08-01T12:00:00Z" },
      { id: randomUUID(), date: "2026-08-02", time: "08:00", createdAt: "2026-08-02T12:00:00Z" },
      { id: randomUUID(), date: "2026-08-03", time: "08:00", createdAt: "2026-08-03T12:00:00Z" },
      { id: randomUUID(), date: "2026-08-04", time: "08:00", createdAt: "2026-08-04T12:00:00Z" },
      { id: randomUUID(), date: "2026-08-05", time: "08:00", createdAt: "2026-08-05T12:00:00Z" },
      { id: tiedInspectionIds[0], date: "2026-08-06", time: "09:30", createdAt: "2026-08-06T13:30:00Z" },
      { id: tiedInspectionIds[1], date: "2026-08-06", time: "09:30", createdAt: "2026-08-06T13:30:00Z" },
    ];
    for (const [index, row] of rows.entries()) {
      await insertInspection(
        hiveId,
        row.id,
        row.date,
        row.time,
        row.createdAt,
        index === 0 ? "Oldest nullable row" : null,
        index === 0 ? "poor" : null,
      );
    }

    // when the first, second, and beyond-final pages are retrieved
    const firstPage = await repository.findPageForAccount({ accountId, hiveId, page: 1 });
    const secondPage = await repository.findPageForAccount({ accountId, hiveId, page: 2 });
    const beyondFinalPage = await repository.findPageForAccount({ accountId, hiveId, page: 3 });

    // then every page keeps the full count and SQL ordering while mapping times and nullable fields
    const expectedOrder = [...tiedInspectionIds].reverse().concat(rows.slice(2, 5).reverse().map(({ id }) => id));
    expect(firstPage?.inspections.map(({ inspectionId }) => inspectionId)).toEqual(expectedOrder);
    expect(firstPage).toMatchObject({ totalItems: 7 });
    expect(firstPage?.inspections).toHaveLength(5);
    expect(firstPage?.inspections.every(({ inspectionTime }) => inspectionTime === "09:30" || inspectionTime === "08:00")).toBe(true);
    expect(secondPage?.inspections.map(({ inspectionId }) => inspectionId)).toEqual([rows[1].id, rows[0].id]);
    expect(secondPage?.totalItems).toBe(7);
    expect(secondPage?.inspections[1]).toMatchObject({
      inspectionTime: "08:00",
      broodPattern: "poor",
      additionalNotes: "Oldest nullable row",
    });
    expect(secondPage?.inspections[0]).toMatchObject({ broodPattern: null, additionalNotes: null });
    expect(beyondFinalPage).toEqual({ inspections: [], totalItems: 7 });
  });

  it("does not disclose foreign or missing hives", async () => {
    // given an empty owned hive, a foreign hive with data, and a missing hive identifier
    const repository = new HiveInspectionRepository();
    const accountId = await createAccount("Inspection page owner");
    const otherAccountId = await createAccount("Inspection page outsider");
    const emptyHiveId = await createHive(accountId, "Empty page hive");
    const foreignHiveId = await createHive(otherAccountId, "Foreign page hive");
    await insertInspection(foreignHiveId, randomUUID(), "2026-08-06", "10:15", "2026-08-06T14:15:00Z");

    // when the account requests empty, foreign, and missing hive histories
    const emptyPage = await repository.findPageForAccount({ accountId, hiveId: emptyHiveId, page: 1 });
    const foreignPage = await repository.findPageForAccount({ accountId, hiveId: foreignHiveId, page: 1 });
    const missingPage = await repository.findPageForAccount({ accountId, hiveId: randomUUID(), page: 1 });

    // then the owned empty page is distinguishable but foreign and missing hives are both hidden
    expect(emptyPage).toEqual({ inspections: [], totalItems: 0 });
    expect(foreignPage).toBeNull();
    expect(missingPage).toBeNull();
  });

  async function createAccount(name: string): Promise<string> {
    const accountId = randomUUID();
    accountIds.push(accountId);
    await database.query("INSERT INTO accounts (id, name) VALUES ($1, $2)", [accountId, name]);
    return accountId;
  }

  async function createHive(accountId: string, name: string): Promise<string> {
    const hiveId = randomUUID();
    await database.query(
      "INSERT INTO hives (hive_id, account_id, status, name) VALUES ($1, $2, true, $3)",
      [hiveId, accountId, name],
    );
    return hiveId;
  }

  async function insertInspection(
    hiveId: string,
    inspectionId: string,
    inspectionDate: string,
    inspectionTime: string,
    createdAt: string,
    additionalNotes: string | null = null,
    broodPattern: "good" | "fair" | "poor" | "na" | null = null,
  ): Promise<void> {
    await database.query(
      `INSERT INTO hive_inspections (
         inspection_id, hive_id, inspection_date, inspection_time, queen_right, eggs, larva,
         capped_brood, brood_pattern, additional_notes, created_at, updated_at
       ) VALUES ($1, $2, $3::date, $4::time, false, false, false, false, $6, $7, $5, $5)`,
      [inspectionId, hiveId, inspectionDate, inspectionTime, createdAt, broodPattern, additionalNotes],
    );
  }
});
