import type { AccountModel } from "../models/account.model.js";
import { database, type Queryable } from "../utils/database.js";

interface AccountRow {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export class AccountRepository {
  async create(name: string, client?: Queryable): Promise<AccountModel> {
    const executor = client ?? database;
    const result = await executor.query<AccountRow>(
      `INSERT INTO accounts (name)
       VALUES ($1)
       RETURNING id, name, created_at, updated_at`,
      [name],
    );

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
