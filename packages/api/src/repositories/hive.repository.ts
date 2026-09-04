import type { HiveModel } from "../models/hive.model.js";
import { database } from "../utils/database.js";

interface HiveRow {
  hive_id: string;
  account_id: string;
  apiary_id: string;
  name: string;
  status: boolean;
  created_at: Date;
  updated_at: Date;
}

const POSTGRES_UNIQUE_VIOLATION_CODE = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION_CODE;
}

export class DuplicateHiveNameError extends Error {
  constructor() {
    super("Duplicate hive name");
    this.name = "DuplicateHiveNameError";
  }
}

export class HiveRepository {
  async create(input: { accountId: string; apiaryId: string; name: string; status: boolean }): Promise<HiveModel> {
    try {
      const result = await database.query<HiveRow>(
        `INSERT INTO hives (account_id, apiary_id, name, status)
         VALUES ($1, $2, $3, $4)
         RETURNING hive_id, account_id, apiary_id, name, status, created_at, updated_at`,
        [input.accountId, input.apiaryId, input.name, input.status],
      );

      return this.mapHive(result.rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateHiveNameError();
      }

      throw error;
    }
  }

  async findByAccountIdAndApiaryId(accountId: string, apiaryId: string): Promise<HiveModel[]> {
    const result = await database.query<HiveRow>(
      `SELECT hive_id, account_id, apiary_id, name, status, created_at, updated_at
       FROM hives
       WHERE account_id = $1
         AND apiary_id = $2
       ORDER BY created_at ASC, hive_id ASC`,
      [accountId, apiaryId],
    );

    return result.rows.map((row) => this.mapHive(row));
  }

  async update(input: { accountId: string; hiveId: string; apiaryId: string; name: string; status: boolean }): Promise<HiveModel | null> {
    try {
      const result = await database.query<HiveRow>(
        `UPDATE hives
         SET apiary_id = $3,
             name = $4,
             status = $5,
             updated_at = NOW()
         WHERE account_id = $1
           AND hive_id = $2
         RETURNING hive_id, account_id, apiary_id, name, status, created_at, updated_at`,
        [input.accountId, input.hiveId, input.apiaryId, input.name, input.status],
      );

      const row = result.rows[0];

      if (!row) {
        return null;
      }

      return this.mapHive(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateHiveNameError();
      }

      throw error;
    }
  }

  private mapHive(row: HiveRow): HiveModel {
    return {
      hiveId: row.hive_id,
      accountId: row.account_id,
      apiaryId: row.apiary_id,
      name: row.name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
