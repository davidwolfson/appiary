import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { AuthResult } from "../../../src/types/auth.types.js";
import { AccountRepository } from "../../../src/repositories/account.repository.js";
import { RevokedTokenRepository } from "../../../src/repositories/revoked-token.repository.js";
import { UserRepository } from "../../../src/repositories/user.repository.js";
import { AuthService } from "../../../src/services/auth.service.js";
import { AppError } from "../../../src/utils/app-error.js";
import { database, type Queryable } from "../../../src/utils/database.js";
import { runDatabaseMigrations } from "../../../src/utils/migrations.js";

class TwoPartyBarrier {
  private readonly waiters: Array<() => void> = [];

  async wait(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for duplicate-email prechecks")), 5_000);
      this.waiters.push(() => {
        clearTimeout(timeout);
        resolve();
      });

      if (this.waiters.length === 2) {
        for (const release of this.waiters.splice(0)) {
          release();
        }
      }
    });
  }
}

class BarrierUserRepository extends UserRepository {
  private lookupCount = 0;

  constructor(
    private readonly delegate: UserRepository,
    private readonly barrier: TwoPartyBarrier,
  ) {
    super();
  }

  override async findByEmail(email: string) {
    const user = await this.delegate.findByEmail(email);
    this.lookupCount += 1;

    if (this.lookupCount <= 2) {
      if (user) {
        throw new Error("Expected both concurrent registration prechecks to find no user");
      }
      await this.barrier.wait();
    }

    return user;
  }

  override create(
    input: { accountId: string; email: string; passwordHash: string },
    client?: Queryable,
  ) {
    return this.delegate.create(input, client);
  }

  override findById(userId: string) {
    return this.delegate.findById(userId);
  }
}

describe("AuthService PostgreSQL integration", () => {
  const accountNames: string[] = [];

  beforeAll(async () => {
    await runDatabaseMigrations();
  });

  afterEach(async () => {
    if (accountNames.length > 0) {
      await database.query("DELETE FROM accounts WHERE name = ANY($1::text[])", [[...accountNames]]);
      accountNames.length = 0;
    }
  });

  afterAll(async () => {
    await database.close();
  });

  it("rejects a sequential normalized duplicate", async () => {
    // given one canonical email and two uniquely marked candidate accounts
    const marker = randomUUID();
    const canonicalEmail = `normalized-${marker}@example.com`;
    const firstAccountName = `Normalized first ${marker}`;
    const secondAccountName = `Normalized second ${marker}`;
    accountNames.push(firstAccountName, secondAccountName);
    const service = createService(new UserRepository());

    // when the email is registered through two padded and case-varied representations
    const firstResult = await service.register({
      accountName: firstAccountName,
      email: `  Normalized-${marker}@Example.COM  `,
      password: "password123",
    });
    const secondResult = service.register({
      accountName: secondAccountName,
      email: `NORMALIZED-${marker}@EXAMPLE.COM`,
      password: "password456",
    });

    // then only the canonical user and its account survive
    await expect(secondResult).rejects.toEqual(new AppError(409, "Email is already registered"));
    expect(firstResult.user.email).toBe(canonicalEmail);
    const users = await database.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE email = $1",
      [canonicalEmail],
    );
    const accounts = await countCandidateAccounts([firstAccountName, secondAccountName]);
    expect(users.rows[0].count).toBe("1");
    expect(accounts).toBe("1");
  });

  it("returns one conflict for concurrent duplicate registrations", async () => {
    // given two registrations whose real PostgreSQL prechecks meet at a barrier
    const marker = randomUUID();
    const canonicalEmail = `concurrent-${marker}@example.com`;
    const firstAccountName = `Concurrent first ${marker}`;
    const secondAccountName = `Concurrent second ${marker}`;
    accountNames.push(firstAccountName, secondAccountName);
    const repository = new BarrierUserRepository(new UserRepository(), new TwoPartyBarrier());
    const service = createService(repository);

    // when both registrations proceed from absent prechecks into real transactions
    const settled = await Promise.allSettled([
      service.register({ accountName: firstAccountName, email: canonicalEmail, password: "password123" }),
      service.register({ accountName: secondAccountName, email: canonicalEmail, password: "password456" }),
    ]);

    // then exactly one succeeds, one returns the established conflict, and the loser rolls back
    const successes = settled.filter((result): result is PromiseFulfilledResult<AuthResult> => result.status === "fulfilled");
    const failures = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toEqual(new AppError(409, "Email is already registered"));
    expect(successes[0].value.user.email).toBe(canonicalEmail);
    const users = await database.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE email = $1",
      [canonicalEmail],
    );
    const accounts = await countCandidateAccounts([firstAccountName, secondAccountName]);
    expect(users.rows[0].count).toBe("1");
    expect(accounts).toBe("1");
  });

  function createService(userRepository: UserRepository): AuthService {
    return new AuthService(
      new AccountRepository(),
      userRepository,
      new RevokedTokenRepository(),
    );
  }

  async function countCandidateAccounts(names: string[]): Promise<string> {
    const result = await database.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM accounts WHERE name = ANY($1::text[])",
      [names],
    );
    return result.rows[0].count;
  }
});
