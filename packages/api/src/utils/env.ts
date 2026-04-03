import { config } from "dotenv";
import { z } from "zod";

config({ override: true });

const EnvSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:4200"),
});

export const env = EnvSchema.parse(process.env);
