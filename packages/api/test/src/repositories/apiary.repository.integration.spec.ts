import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ApiaryRepository,
  DuplicateApiaryNameError,
} from "../../../src/repositories/apiary.repository.js";
import { database } from "../../../src/utils/database.js";
import { runDatabaseMigrations } from "../../../src/utils/migrations.js";

describe("ApiaryRepository PostgreSQL integration", () => {
  const accountIds: string[] = [];

  beforeAll(async () => {
    await runDatabaseMigrations();
  });

  afterAll(async () => {
    if (accountIds.length > 0) {
      await database.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [accountIds]);
    }
    await database.close();
  });

  it("creates an apiary using database defaults", async () => {
    // given an account and an apiary name
    const repository = new ApiaryRepository();
    const accountId = await createAccount("Create apiary account");
    const name = `North ${randomUUID()}`;

    // when the apiary is created
    const created = await repository.create({ accountId, name });

    // then PostgreSQL supplies its ID, active status, and timestamps
    expect(created).toMatchObject({ accountId, name, status: true });
    expect(created.apiaryId).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
  });

  it("lists only account apiaries in ID order including inactive rows", async () => {
    // given two deliberately reverse-inserted apiaries and a foreign apiary
    const repository = new ApiaryRepository();
    const ownerAccountId = await createAccount("List apiary owner");
    const otherAccountId = await createAccount("List apiary outsider");
    const orderedApiaryIds = [randomUUID(), randomUUID()].sort();
    await insertApiary(orderedApiaryIds[1], ownerAccountId, `Second ${randomUUID()}`, true);
    await insertApiary(orderedApiaryIds[0], ownerAccountId, `First ${randomUUID()}`, false);
    const foreignApiaryId = randomUUID();
    await insertApiary(foreignApiaryId, otherAccountId, `Foreign ${randomUUID()}`, true);

    // when the owner's apiaries are listed
    const apiaries = await repository.findByAccountId(ownerAccountId);

    // then only owned rows are returned in ID order without filtering by status
    expect(apiaries.map(({ apiaryId }) => apiaryId)).toEqual(orderedApiaryIds);
    expect(apiaries.map(({ status }) => status)).toEqual([false, true]);
    expect(apiaries.some(({ apiaryId }) => apiaryId === foreignApiaryId)).toBe(false);
  });

  it("enforces case-insensitive names per account", async () => {
    // given two accounts and one existing mixed-case apiary name
    const repository = new ApiaryRepository();
    const firstAccountId = await createAccount("Duplicate apiary owner");
    const secondAccountId = await createAccount("Duplicate apiary outsider");
    const marker = randomUUID();
    await repository.create({ accountId: firstAccountId, name: `North ${marker}` });

    // when the case-varied name is created within the same and another account
    const [sameAccount, otherAccount] = await Promise.allSettled([
      repository.create({ accountId: firstAccountId, name: `nOrTh ${marker}` }),
      repository.create({ accountId: secondAccountId, name: `NORTH ${marker}` }),
    ]);

    // then only the same-account request receives the stable duplicate error
    expect(sameAccount).toMatchObject({ status: "rejected", reason: expect.any(DuplicateApiaryNameError) });
    expect(otherAccount).toMatchObject({
      status: "fulfilled",
      value: expect.objectContaining({ accountId: secondAccountId, name: `NORTH ${marker}`, status: true }),
    });
  });

  it("finds owned apiaries without disclosing foreign apiaries", async () => {
    // given an apiary owned by one account and a different account
    const repository = new ApiaryRepository();
    const ownerAccountId = await createAccount("Find apiary owner");
    const otherAccountId = await createAccount("Find apiary outsider");
    const apiary = await repository.create({ accountId: ownerAccountId, name: `Owned ${randomUUID()}` });

    // when the apiary is looked up from both accounts
    const ownedApiary = await repository.findByAccountIdAndApiaryId(ownerAccountId, apiary.apiaryId);
    const foreignApiary = await repository.findByAccountIdAndApiaryId(otherAccountId, apiary.apiaryId);

    // then the owner can find it without disclosing it to the other account
    expect(ownedApiary).toMatchObject({ apiaryId: apiary.apiaryId, accountId: ownerAccountId });
    expect(foreignApiary).toBeNull();
  });

  async function createAccount(namePrefix: string): Promise<string> {
    const accountId = randomUUID();
    accountIds.push(accountId);
    await database.query("INSERT INTO accounts (id, name) VALUES ($1, $2)", [
      accountId,
      `${namePrefix} ${randomUUID()}`,
    ]);
    return accountId;
  }

  async function insertApiary(
    apiaryId: string,
    accountId: string,
    name: string,
    status: boolean,
  ): Promise<void> {
    await database.query(
      "INSERT INTO apiaries (apiary_id, account_id, name, status) VALUES ($1, $2, $3, $4)",
      [apiaryId, accountId, name, status],
    );
  }
});
