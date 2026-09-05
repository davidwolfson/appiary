import type { ApiaryModel } from "../models/apiary.model.js";
import { database } from "../utils/database.js";

interface ApiaryRow {
  apiary_id: string;
  account_id: string;
  name: string;
  status: boolean;
  created_at: Date;
  updated_at: Date;
}

const POSTGRES_UNIQUE_VIOLATION_CODE = "23505";
const APIARY_NAME_UNIQUE_CONSTRAINT = "apiaries_account_id_lower_name_key";

function isDuplicateApiaryNameViolation(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && "constraint" in error
    && (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION_CODE
    && (error as { constraint?: string }).constraint === APIARY_NAME_UNIQUE_CONSTRAINT;
}

export class DuplicateApiaryNameError extends Error {
  constructor() {
    super("Duplicate apiary name");
    this.name = "DuplicateApiaryNameError";
  }
}

export class ApiaryRepository {
  async create(input: { accountId: string; name: string }): Promise<ApiaryModel> {
    try {
      const result = await database.query<ApiaryRow>(
        `INSERT INTO apiaries (account_id, name)
         VALUES ($1, $2)
         RETURNING apiary_id, account_id, name, status, created_at, updated_at`,
        [input.accountId, input.name],
      );

      return this.mapApiary(result.rows[0]);
    } catch (error) {
      if (isDuplicateApiaryNameViolation(error)) {
        throw new DuplicateApiaryNameError();
      }

      throw error;
    }
  }

  async findByAccountId(accountId: string): Promise<ApiaryModel[]> {
    const result = await database.query<ApiaryRow>(
      `SELECT apiary_id, account_id, name, status, created_at, updated_at
       FROM apiaries
       WHERE account_id = $1
       ORDER BY apiary_id ASC`,
      [accountId],
    );

    return result.rows.map((row) => this.mapApiary(row));
  }

  async findByAccountIdAndApiaryId(accountId: string, apiaryId: string): Promise<ApiaryModel | null> {
    const result = await database.query<ApiaryRow>(
      `SELECT apiary_id, account_id, name, status, created_at, updated_at
       FROM apiaries
       WHERE account_id = $1
         AND apiary_id = $2`,
      [accountId, apiaryId],
    );

    const row = result.rows[0];
    return row ? this.mapApiary(row) : null;
  }

  private mapApiary(row: ApiaryRow): ApiaryModel {
    return {
      apiaryId: row.apiary_id,
      accountId: row.account_id,
      name: row.name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
