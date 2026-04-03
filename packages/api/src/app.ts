import cors from "cors";
import express from "express";

import { authRouter } from "./controllers/auth.controller.js";
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
  app.use(errorMiddleware);

  return app;
}

