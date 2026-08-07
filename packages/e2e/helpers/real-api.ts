import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import type { APIRequestContext, APIResponse } from "@playwright/test";
import type {
  AuthResponse,
  CreateHiveInspectionRequest,
  CreateHiveInspectionResponse,
  CreateHiveRequest,
  CreateHiveResponse,
  RegisterRequest,
} from "@appiary/types";
import { config } from "dotenv";
import { Pool } from "pg";

const TEST_DATABASE_NAME = "appiary_test";
const rootEnvPath = resolve(process.cwd(), "../../.env");

export interface RealApiIdentity {
  registration: RegisterRequest;
  accountName: string;
  email: string;
  password: string;
}

export function createRealApiIdentity(): RealApiIdentity {
  const marker = randomUUID();
  const password = "real-api-secret123";
  const accountName = `Real Apiary ${marker}`;
  const email = `real-api-${marker}@example.com`;

  return {
    accountName,
    email,
    password,
    registration: { accountName, email, password, confirmPassword: password },
  };
}

export function createRealHiveInput(): CreateHiveRequest {
  return { name: `Real Hive ${randomUUID()}`, status: true };
}

export function createRealInspectionInput(
  sequence: number,
  overrides: Partial<CreateHiveInspectionRequest> = {},
): CreateHiveInspectionRequest {
  return {
    inspectionDate: `2026-08-${String(sequence).padStart(2, "0")}`,
    inspectionTime: "09:30",
    queenRight: true,
    eggs: sequence % 2 === 0,
    larva: true,
    cappedBrood: false,
    broodPattern: "good",
    additionalNotes: `Real inspection ${sequence} ${randomUUID()}`,
    ...overrides,
  };
}

export class RealApiCleanup {
  private readonly accountIds = new Set<string>();
  private readonly registrationEmails = new Set<string>();
  private pool: Pool | undefined;

  recordRegistration(email: string): void {
    this.registrationEmails.add(email);
  }

  recordAccount(accountId: string): void {
    this.accountIds.add(accountId);
  }

  async cleanupTrackedAccounts(): Promise<void> {
    if (this.accountIds.size === 0 && this.registrationEmails.size === 0) return;

    const pool = this.getPool();
    if (this.registrationEmails.size > 0) {
      const recovered = await pool.query<{ account_id: string }>(
        "SELECT account_id FROM users WHERE email = ANY($1::text[])",
        [[...this.registrationEmails]],
      );
      for (const row of recovered.rows) this.accountIds.add(row.account_id);
    }

    if (this.accountIds.size > 0) {
      await pool.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [[...this.accountIds]]);
    }
    this.accountIds.clear();
    this.registrationEmails.clear();
  }

  async close(): Promise<void> {
    await this.pool?.end();
    this.pool = undefined;
  }

  private getPool(): Pool {
    if (this.pool) return this.pool;

    config({ path: rootEnvPath, override: false });
    assertSafeRealApiDatabase(process.env.DB_NAME);
    this.pool = new Pool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? "5432"),
      database: process.env.DB_NAME,
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD ?? "postgres",
    });
    return this.pool;
  }
}

export function assertSafeRealApiDatabase(databaseName: string | undefined): void {
  if (databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing real API E2E cleanup for database "${databaseName ?? "<missing>"}". `
      + `DB_NAME must be exactly "${TEST_DATABASE_NAME}".`,
    );
  }
}

export async function registerThroughRealApi(
  request: APIRequestContext,
  cleanup: RealApiCleanup,
  registration: RegisterRequest,
): Promise<AuthResponse> {
  cleanup.recordRegistration(registration.email);
  const response = await request.post("/api/auth/register", { data: registration });
  const result = await readSuccessfulJson<AuthResponse>(response, "register account");
  cleanup.recordAccount(result.user.accountId);
  return result;
}

export async function createHiveThroughRealApi(
  request: APIRequestContext,
  token: string,
  input: CreateHiveRequest,
): Promise<CreateHiveResponse> {
  const response = await request.post("/api/hives", {
    data: input,
    headers: { Authorization: `Bearer ${token}` },
  });
  return readSuccessfulJson<CreateHiveResponse>(response, "create hive");
}

export async function createInspectionThroughRealApi(
  request: APIRequestContext,
  token: string,
  hiveId: string,
  input: CreateHiveInspectionRequest,
): Promise<CreateHiveInspectionResponse> {
  const response = await request.post(`/api/hives/${hiveId}/inspections`, {
    data: input,
    headers: { Authorization: `Bearer ${token}` },
  });
  return readSuccessfulJson<CreateHiveInspectionResponse>(response, "create inspection");
}

async function readSuccessfulJson<T>(response: APIResponse, action: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`Could not ${action}: ${response.status()} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}
