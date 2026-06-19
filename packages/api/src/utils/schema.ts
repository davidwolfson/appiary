import { AppError } from "./app-error.js";
import { database } from "./database.js";

interface ColumnRow {
  table_name: string;
  column_name: string;
}

const requiredColumnsByTable = {
  accounts: ["id", "name", "created_at", "updated_at"],
  users: ["id", "account_id", "email", "password_hash", "created_at", "updated_at"],
  revoked_tokens: ["jti", "expires_at", "created_at"],
  hives: ["hive_id", "account_id", "status", "name", "created_at", "updated_at"],
} satisfies Record<string, string[]>;

export async function assertDatabaseSchema(): Promise<void> {
  const tableNames = Object.keys(requiredColumnsByTable) as Array<keyof typeof requiredColumnsByTable>;
  const result = await database.query<ColumnRow>(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])`,
    [tableNames],
  );

  const columnsByTable = new Map<string, Set<string>>();

  for (const row of result.rows) {
    const columns = columnsByTable.get(row.table_name) ?? new Set<string>();
    columns.add(row.column_name);
    columnsByTable.set(row.table_name, columns);
  }

  const mismatches = tableNames.flatMap((tableName) => {
    const actualColumns = columnsByTable.get(tableName) ?? new Set<string>();
    const missingColumns = requiredColumnsByTable[tableName].filter((columnName: string) => !actualColumns.has(columnName));

    if (missingColumns.length === 0) {
      return [];
    }

    const actualSummary = [...actualColumns].sort().join(", ") || "none";
    return `${tableName}: missing ${missingColumns.join(", ")}; found ${actualSummary}`;
  });

  if (mismatches.length > 0) {
    throw new AppError(
      500,
      `Database schema is out of date after running migrations. Check packages/api/db/migrations. ${mismatches.join(" | ")}`,
    );
  }
}
