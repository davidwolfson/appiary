import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const rootEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env");

export function configureTestEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  envPath: string = rootEnvPath,
): void {
  config({
    path: envPath,
    override: false,
    processEnv: environment as Record<string, string>,
  });

  environment.NODE_ENV = "test";
  environment.DB_HOST ??= "localhost";
  environment.DB_PORT ??= "5432";
  environment.DB_NAME = "appiary_test";
  environment.DB_USER ??= "postgres";
  environment.DB_PASSWORD ??= "postgres";
  environment.JWT_SECRET ??= "test-secret";
  environment.PORT ??= "3001";
  environment.CLIENT_ORIGIN ??= "http://localhost:4200";
}
