const testDatabaseName = "appiary_test";

export function assertSafeTestDatabase(databaseName: string | undefined): void {
  if (databaseName !== testDatabaseName) {
    throw new Error(
      `Refusing to use database "${databaseName ?? "<missing>"}" in test mode. `
        + `DB_NAME must be exactly "${testDatabaseName}" before tests can connect or run migrations.`,
    );
  }
}
