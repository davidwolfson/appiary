import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { z } from "zod";

import { assertSafeTestDatabase } from "./test-database-safety.js";

function findEnvPath(): string | undefined {
  const searchRoots = [
    process.cwd(),
    dirname(fileURLToPath(import.meta.url)),
  ];

  for (const root of searchRoots) {
    let current = root;

    for (let depth = 0; depth < 6; depth += 1) {
      const candidate = resolve(current, ".env");
      if (existsSync(candidate)) {
        return candidate;
      }

      const parent = resolve(current, "..");
      if (parent === current) {
        break;
      }

      current = parent;
    }
  }

  return undefined;
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:4200"),
});

export function parseEnvironment(environment: NodeJS.ProcessEnv) {
  if (environment.NODE_ENV === "test") {
    assertSafeTestDatabase(environment.DB_NAME);
  }

  return EnvSchema.parse(environment);
}

export function loadEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  envPath: string | undefined = findEnvPath(),
) {
  config({
    path: envPath,
    override: false,
    processEnv: environment as Record<string, string>,
  });

  return parseEnvironment(environment);
}

export const env = loadEnvironment();
