import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadEnvironment, parseEnvironment } from "../../../src/utils/env.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

function validEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "development",
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_NAME: "appiary",
    DB_USER: "postgres",
    DB_PASSWORD: "postgres",
    JWT_SECRET: "test-secret",
    PORT: "3001",
    CLIENT_ORIGIN: "http://localhost:4200",
    ...overrides,
  };
}

describe("environment configuration", () => {
  it("keeps a process-supplied test database when an env file conflicts", async () => {
    // given a safe process value and an env file pointing at the development database
    const directory = await mkdtemp(join(tmpdir(), "appiary-env-"));
    temporaryDirectories.push(directory);
    const envPath = join(directory, ".env");
    await writeFile(envPath, "DB_NAME=appiary\n", "utf8");
    const processEnvironment = validEnvironment({ NODE_ENV: "test", DB_NAME: "appiary_test" });

    // when dotenv fills only missing process values
    const parsedEnvironment = loadEnvironment(processEnvironment, envPath);

    // then the safe process value remains authoritative
    expect(parsedEnvironment.DB_NAME).toBe("appiary_test");
  });

  it("rejects an unsafe test database during environment construction", () => {
    // given test mode points at the development database
    const processEnvironment = validEnvironment({ NODE_ENV: "test", DB_NAME: "appiary" });

    // when environment initialization runs
    const initializeEnvironment = () => parseEnvironment(processEnvironment);

    // then initialization fails before database construction can proceed
    expect(initializeEnvironment).toThrow(/DB_NAME must be exactly "appiary_test"/);
  });
});
