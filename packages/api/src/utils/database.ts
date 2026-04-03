import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import { env } from "./env.js";

export class Database {
  private readonly pool = new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });

  query<TResult extends QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<TResult>> {
    return this.pool.query<TResult>(text, values);
  }

  async withTransaction<TResult>(callback: (client: PoolClient) => Promise<TResult>): Promise<TResult> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export const database = new Database();
