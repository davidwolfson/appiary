import { database, type Queryable } from "../utils/database.js";

interface RevokedTokenRow {
  jti: string;
}

export class RevokedTokenRepository {
  async create(input: { jti: string; expiresAt: Date }, client?: Queryable): Promise<void> {
    const executor = client ?? database;

    await executor.query(
      `INSERT INTO revoked_tokens (jti, expires_at)
       VALUES ($1, $2)
       ON CONFLICT (jti) DO NOTHING`,
      [input.jti, input.expiresAt],
    );
  }

  async isRevoked(jti: string): Promise<boolean> {
    const result = await database.query<RevokedTokenRow>(
      `SELECT jti
       FROM revoked_tokens
       WHERE jti = $1
         AND expires_at > NOW()
       LIMIT 1`,
      [jti],
    );

    return (result.rowCount ?? 0) > 0;
  }
}
