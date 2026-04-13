import type { UserModel, UserWithAccountModel } from "../models/user.model.js";
import { database, type Queryable } from "../utils/database.js";

interface UserRow {
  id: string;
  account_id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

interface UserWithAccountRow extends UserRow {
  account_name: string;
}

export class UserRepository {
  async create(input: { accountId: string; email: string; passwordHash: string }, client?: Queryable): Promise<UserModel> {
    const executor = client ?? database;
    const result = await executor.query<UserRow>(
      `INSERT INTO users (account_id, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, account_id, email, password_hash, created_at, updated_at`,
      [input.accountId, input.email, input.passwordHash],
    );

    return this.mapUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<UserWithAccountModel | null> {
    const result = await database.query<UserWithAccountRow>(
      `SELECT u.id, u.account_id, u.email, u.password_hash, u.created_at, u.updated_at, a.name AS account_name
       FROM users u
       INNER JOIN accounts a ON a.id = u.account_id
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [email],
    );

    const row = result.rows[0];

    return row ? this.mapUserWithAccount(row) : null;
  }

  async findById(userId: string): Promise<UserWithAccountModel | null> {
    const result = await database.query<UserWithAccountRow>(
      `SELECT u.id, u.account_id, u.email, u.password_hash, u.created_at, u.updated_at, a.name AS account_name
       FROM users u
       INNER JOIN accounts a ON a.id = u.account_id
       WHERE u.id = $1
       LIMIT 1`,
      [userId],
    );

    const row = result.rows[0];

    return row ? this.mapUserWithAccount(row) : null;
  }

  private mapUser(row: UserRow): UserModel {
    return {
      id: row.id,
      accountId: row.account_id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapUserWithAccount(row: UserWithAccountRow): UserWithAccountModel {
    return {
      ...this.mapUser(row),
      accountName: row.account_name,
    };
  }
}
