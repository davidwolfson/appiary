import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { RevokedTokenRepository } from "../../../src/repositories/revoked-token.repository.js";
import { database } from "../../../src/utils/database.js";
import { runDatabaseMigrations } from "../../../src/utils/migrations.js";

describe("RevokedTokenRepository PostgreSQL integration", () => {
  const tokenIds: string[] = [];

  beforeAll(async () => {
    await runDatabaseMigrations();
  });

  afterAll(async () => {
    if (tokenIds.length > 0) {
      await database.query("DELETE FROM revoked_tokens WHERE jti = ANY($1::uuid[])", [tokenIds]);
    }
    await database.close();
  });

  it("reports only unexpired persisted tokens as revoked", async () => {
    // given one future token, one expired token, and one unknown token
    const repository = new RevokedTokenRepository();
    const futureJti = trackToken();
    const expiredJti = trackToken();
    const unknownJti = trackToken();
    await repository.create({ jti: futureJti, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    await repository.create({ jti: expiredJti, expiresAt: new Date(Date.now() - 60 * 60 * 1000) });

    // when each token is checked against PostgreSQL
    const futureIsRevoked = await repository.isRevoked(futureJti);
    const expiredIsRevoked = await repository.isRevoked(expiredJti);
    const unknownIsRevoked = await repository.isRevoked(unknownJti);

    // then only the unexpired persisted token is revoked
    expect(futureIsRevoked).toBe(true);
    expect(expiredIsRevoked).toBe(false);
    expect(unknownIsRevoked).toBe(false);
  });

  it("persists duplicate revocations idempotently", async () => {
    // given a JTI with a future expiry
    const repository = new RevokedTokenRepository();
    const jti = trackToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // when the same revocation is created twice
    await repository.create({ jti, expiresAt });
    await repository.create({ jti, expiresAt });
    const result = await database.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM revoked_tokens WHERE jti = $1",
      [jti],
    );

    // then PostgreSQL stores exactly one row
    expect(result.rows[0].count).toBe("1");
  });

  function trackToken(): string {
    const jti = randomUUID();
    tokenIds.push(jti);
    return jti;
  }
});
