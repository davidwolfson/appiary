export const TEST_DATABASE_NAME = "appiary_test";

export function resolveRealApiEnvironment(
  shellEnvironment: NodeJS.ProcessEnv,
  rootEnvironment: NodeJS.ProcessEnv = {},
): Record<string, string> {
  const environment = Object.fromEntries(
    Object.entries({ ...rootEnvironment, ...shellEnvironment })
      .filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  environment.NODE_ENV = "test";
  environment.DB_NAME = shellEnvironment.DB_NAME ?? TEST_DATABASE_NAME;

  assertSafeRealApiDatabase(environment.DB_NAME);
  return environment;
}

export function assertSafeRealApiDatabase(databaseName: string | undefined): void {
  if (databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing real API E2E cleanup for database "${databaseName ?? "<missing>"}". `
      + `DB_NAME must be exactly "${TEST_DATABASE_NAME}".`,
    );
  }
}
