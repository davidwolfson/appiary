import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { database, type Queryable } from "./database.js";

interface MigrationFile {
  filename: string;
  sql: string;
}

interface MigrationRow {
  filename: string;
}

const migrationFilenamePattern = /^\d{3}_[a-z0-9_]+\.sql$/;
const migrationsDirectory = fileURLToPath(new URL("../../db/migrations/", import.meta.url));

async function loadMigrationFiles(directory = migrationsDirectory): Promise<MigrationFile[]> {
  const filenames = (await readdir(directory))
    .filter((filename) => migrationFilenamePattern.test(filename))
    .sort();

  return Promise.all(
    filenames.map(async (filename) => ({
      filename,
      sql: await readFile(join(directory, filename), "utf8"),
    })),
  );
}

async function ensureMigrationTable(client: Queryable): Promise<void> {
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );
}

export async function runDatabaseMigrations(): Promise<void> {
  const migrationFiles = await loadMigrationFiles();

  await database.withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(481516, 2342)");
    await ensureMigrationTable(client);

    const appliedResult = await client.query<MigrationRow>("SELECT filename FROM schema_migrations");
    const appliedFilenames = new Set(appliedResult.rows.map((row) => row.filename));

    for (const migration of migrationFiles) {
      if (appliedFilenames.has(migration.filename)) {
        continue;
      }

      await client.query(migration.sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [migration.filename]);
    }
  });
}
