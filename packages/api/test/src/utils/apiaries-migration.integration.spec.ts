import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { database } from "../../../src/utils/database.js";

const schemaSqlPath = fileURLToPath(new URL("../../../db/schema.sql", import.meta.url));
const migrationPaths = [
  "001_initial_auth.sql",
  "002_hives.sql",
  "003_hive_inspections.sql",
  "004_apiaries.sql",
].map((filename) => fileURLToPath(new URL(`../../../db/migrations/${filename}`, import.meta.url)));

describe("apiaries database migration", () => {
  const schemaNames: string[] = [];

  afterEach(async () => {
    for (const schemaName of schemaNames.splice(0)) {
      await database.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    }
  });

  it("creates the fresh schema with required apiary ownership", async () => {
    // given an isolated empty PostgreSQL schema
    const schemaName = await createIsolatedSchema();
    const schemaSql = await readFile(schemaSqlPath, "utf8");

    // when the canonical schema is applied
    await executeInSchema(schemaName, schemaSql);
    const columns = await database.query<{ table_name: string; column_name: string; is_nullable: string }>(
      `SELECT table_name, column_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name IN ('apiaries', 'hives')`,
      [schemaName],
    );

    // then apiaries exist and hive membership is required
    expect(columns.rows).toEqual(expect.arrayContaining([
      { table_name: "apiaries", column_name: "apiary_id", is_nullable: "NO" },
      { table_name: "apiaries", column_name: "account_id", is_nullable: "NO" },
      { table_name: "apiaries", column_name: "name", is_nullable: "NO" },
      { table_name: "apiaries", column_name: "status", is_nullable: "NO" },
      { table_name: "hives", column_name: "apiary_id", is_nullable: "NO" },
    ]));
  });

  it("backfills one default apiary per account containing hives", async () => {
    // given the pre-apiary schema with hives in two accounts and an empty third account
    const schemaName = await createIsolatedSchema();
    const [initialAuthSql, hivesSql, inspectionsSql, apiariesSql] = await Promise.all(
      migrationPaths.map((path) => readFile(path, "utf8")),
    );
    await executeInSchema(schemaName, [initialAuthSql, hivesSql, inspectionsSql].join("\n"));
    const firstAccountId = randomUUID();
    const secondAccountId = randomUUID();
    const emptyAccountId = randomUUID();
    const firstHiveIds = [randomUUID(), randomUUID()];
    const secondHiveId = randomUUID();
    await database.query(
      `INSERT INTO "${schemaName}".accounts (id, name)
       VALUES ($1, 'First'), ($2, 'Second'), ($3, 'Empty')`,
      [firstAccountId, secondAccountId, emptyAccountId],
    );
    await database.query(
      `INSERT INTO "${schemaName}".hives (hive_id, account_id, status, name)
       VALUES ($1, $3, true, 'First A'), ($2, $3, true, 'First B'), ($4, $5, false, 'Second A')`,
      [firstHiveIds[0], firstHiveIds[1], firstAccountId, secondHiveId, secondAccountId],
    );

    // when the apiary migration upgrades the populated schema
    await executeInSchema(schemaName, apiariesSql);
    const apiaries = await database.query<{ apiary_id: string; account_id: string; name: string; status: boolean }>(
      `SELECT apiary_id, account_id, name, status
       FROM "${schemaName}".apiaries
       ORDER BY account_id`,
    );
    const migratedHives = await database.query<{ hive_id: string; account_id: string; apiary_id: string }>(
      `SELECT hive_id, account_id, apiary_id FROM "${schemaName}".hives`,
    );
    const apiaryNullable = await database.query<{ is_nullable: string }>(
      `SELECT is_nullable
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'hives' AND column_name = 'apiary_id'`,
      [schemaName],
    );

    // then only hive-owning accounts receive one active default and every hive uses its account's apiary
    expect(apiaries.rows).toHaveLength(2);
    expect(apiaries.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ account_id: firstAccountId, name: "Default Apiary", status: true }),
      expect.objectContaining({ account_id: secondAccountId, name: "Default Apiary", status: true }),
    ]));
    expect(apiaries.rows.some(({ account_id }) => account_id === emptyAccountId)).toBe(false);
    const apiaryIdByAccount = new Map(apiaries.rows.map((apiary) => [apiary.account_id, apiary.apiary_id]));
    expect(migratedHives.rows).toHaveLength(3);
    expect(migratedHives.rows.every((hive) => hive.apiary_id === apiaryIdByAccount.get(hive.account_id))).toBe(true);
    expect(migratedHives.rows.map(({ hive_id }) => hive_id)).toEqual(expect.arrayContaining([...firstHiveIds, secondHiveId]));
    expect(apiaryNullable.rows[0]).toEqual({ is_nullable: "NO" });
  });

  it("enforces account-scoped case-insensitive apiary names", async () => {
    // given a fresh schema and two accounts sharing an apiary name
    const schemaName = await createFreshSchema();
    const firstAccountId = randomUUID();
    const secondAccountId = randomUUID();
    await database.query(
      `INSERT INTO "${schemaName}".accounts (id, name) VALUES ($1, 'First'), ($2, 'Second')`,
      [firstAccountId, secondAccountId],
    );
    await database.query(
      `INSERT INTO "${schemaName}".apiaries (account_id, name) VALUES ($1, 'North Yard'), ($2, 'north yard')`,
      [firstAccountId, secondAccountId],
    );

    // when the first account reuses that name with different casing
    const duplicate = database.query(
      `INSERT INTO "${schemaName}".apiaries (account_id, name) VALUES ($1, 'NORTH YARD')`,
      [firstAccountId],
    );

    // then the named account-scoped unique index rejects only the same-account duplicate
    await expect(duplicate).rejects.toMatchObject({
      code: "23505",
      constraint: "apiaries_account_id_lower_name_key",
    });
    const count = await database.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM "${schemaName}".apiaries`);
    expect(count.rows[0].count).toBe("2");
  });

  it("rejects null and cross-account hive apiary relationships", async () => {
    // given two accounts with one apiary each
    const schemaName = await createFreshSchema();
    const firstAccountId = randomUUID();
    const secondAccountId = randomUUID();
    await database.query(
      `INSERT INTO "${schemaName}".accounts (id, name) VALUES ($1, 'First'), ($2, 'Second')`,
      [firstAccountId, secondAccountId],
    );
    const firstApiary = await database.query<{ apiary_id: string }>(
      `INSERT INTO "${schemaName}".apiaries (account_id, name) VALUES ($1, 'First Yard') RETURNING apiary_id`,
      [firstAccountId],
    );
    const secondApiary = await database.query<{ apiary_id: string }>(
      `INSERT INTO "${schemaName}".apiaries (account_id, name) VALUES ($1, 'Second Yard') RETURNING apiary_id`,
      [secondAccountId],
    );

    // when a hive omits its apiary or uses the other account's apiary
    const [nullApiary, crossAccountApiary] = await Promise.allSettled([
      database.query(
        `INSERT INTO "${schemaName}".hives (account_id, apiary_id, status, name) VALUES ($1, NULL, true, 'No yard')`,
        [firstAccountId],
      ),
      database.query(
        `INSERT INTO "${schemaName}".hives (account_id, apiary_id, status, name) VALUES ($1, $2, true, 'Wrong yard')`,
        [firstAccountId, secondApiary.rows[0].apiary_id],
      ),
    ]);

    // then both invalid associations fail while a same-account relationship succeeds
    expect(nullApiary).toMatchObject({ status: "rejected", reason: expect.objectContaining({ code: "23502" }) });
    expect(crossAccountApiary).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({ code: "23503", constraint: "hives_account_id_apiary_id_fkey" }),
    });
    await expect(database.query(
      `INSERT INTO "${schemaName}".hives (account_id, apiary_id, status, name) VALUES ($1, $2, true, 'Right yard')`,
      [firstAccountId, firstApiary.rows[0].apiary_id],
    )).resolves.toMatchObject({ rowCount: 1 });
  });

  async function createIsolatedSchema(): Promise<string> {
    const schemaName = `apiaries_${randomUUID().replaceAll("-", "")}`;
    schemaNames.push(schemaName);
    await database.query(`CREATE SCHEMA "${schemaName}"`);
    return schemaName;
  }

  async function createFreshSchema(): Promise<string> {
    const schemaName = await createIsolatedSchema();
    await executeInSchema(schemaName, await readFile(schemaSqlPath, "utf8"));
    return schemaName;
  }

  async function executeInSchema(schemaName: string, sql: string): Promise<void> {
    await database.withTransaction(async (client) => {
      await client.query(`SET LOCAL search_path TO "${schemaName}", public`);
      await client.query(sql);
    });
  }
});
