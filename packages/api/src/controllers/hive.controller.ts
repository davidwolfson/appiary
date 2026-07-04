import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { HiveRepository } from "../repositories/hive.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { CreateHiveRequestSchema } from "../schemas/hive.schemas.js";
import { HiveService } from "../services/hive.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const hiveService = new HiveService(
  new HiveRepository(),
  new UserRepository(),
);

export const hiveRouter = Router();

hiveRouter.use(requireAuth);

hiveRouter.get("/", asyncHandler(async (req, res) => {
  const result = await hiveService.listForAuthenticatedUser(req.authenticatedUserId!);

  res.status(200).json(result);
}));

hiveRouter.post("/", asyncHandler(async (req, res) => {
  const input = CreateHiveRequestSchema.parse(req.body);

  const result = await hiveService.createForAuthenticatedUser({
    authenticatedUserId: req.authenticatedUserId!,
    name: input.name,
    status: input.status,
  });

  res.status(201).json(result);
}));
