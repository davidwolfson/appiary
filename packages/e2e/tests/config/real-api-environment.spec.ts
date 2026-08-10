import { expect, test } from "@playwright/test";

import {
  resolveRealApiEnvironment,
  TEST_DATABASE_NAME,
} from "../../helpers/real-api-environment";

test.describe("real API environment", () => {
  test("shares the safe default when shell DB_NAME is unset", () => {
    const environment = resolveRealApiEnvironment({}, { DB_NAME: "appiary" });

    expect(environment.DB_NAME).toBe(TEST_DATABASE_NAME);
    expect(environment.NODE_ENV).toBe("test");
  });

  test("uses shell configuration ahead of root .env configuration", () => {
    const environment = resolveRealApiEnvironment(
      { DB_NAME: TEST_DATABASE_NAME, DB_HOST: "shell-host" },
      { DB_NAME: "unsafe-root", DB_HOST: "root-host", DB_PORT: "5433" },
    );

    expect(environment).toMatchObject({
      DB_NAME: TEST_DATABASE_NAME,
      DB_HOST: "shell-host",
      DB_PORT: "5433",
      NODE_ENV: "test",
    });
  });

  test("rejects an unsafe shell database", () => {
    expect(() => resolveRealApiEnvironment({ DB_NAME: "appiary" }))
      .toThrow('DB_NAME must be exactly "appiary_test"');
  });
});
