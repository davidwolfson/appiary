import { createApp } from "./app.js";
import { env } from "./utils/env.js";
import { runDatabaseMigrations } from "./utils/migrations.js";
import { assertDatabaseSchema } from "./utils/schema.js";

const app = createApp();

async function startServer() {
  await runDatabaseMigrations();
  await assertDatabaseSchema();

  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });
}

startServer().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
