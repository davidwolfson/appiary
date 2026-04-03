import { createApp } from "./app.js";
import { env } from "./utils/env.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});
