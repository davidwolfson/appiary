import cors from "cors";
import express from "express";

import { apiaryRouter } from "./controllers/apiary.controller.js";
import { authRouter } from "./controllers/auth.controller.js";
import { hiveRouter } from "./controllers/hive.controller.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { env } from "./utils/env.js";

export function createApp() {
  const app = express();

  app.use(cors({
    origin: env.CLIENT_ORIGIN,
  }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/apiaries", apiaryRouter);
  app.use("/api/hives", hiveRouter);
  app.use(errorMiddleware);

  return app;
}
