import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { configureTestEnvironment } from "./test-environment.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("test environment configuration", () => {
  it("resolves shell values, env values, and fallbacks in precedence order", async () => {
    // given a shell value and an env file containing another connection value
    const directory = await mkdtemp(join(tmpdir(), "appiary-test-env-"));
    temporaryDirectories.push(directory);
    const envPath = join(directory, ".env");
    await writeFile(
      envPath,
      "DB_HOST=env-host\nDB_USER=env-user\nDB_PASSWORD=env-password\nDB_NAME=appiary\n",
      "utf8",
    );
    const environment: NodeJS.ProcessEnv = { DB_HOST: "shell-host" };

    // when the Vitest environment is configured
    configureTestEnvironment(environment, envPath);

    // then shell values win, env values fill gaps, and test-only values are enforced
    expect(environment).toMatchObject({
      NODE_ENV: "test",
      DB_HOST: "shell-host",
      DB_PORT: "5432",
      DB_NAME: "appiary_test",
      DB_USER: "env-user",
      DB_PASSWORD: "env-password",
    });
  });
});
