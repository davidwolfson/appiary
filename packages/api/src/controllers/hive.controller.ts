import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { HiveRepository } from "../repositories/hive.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { CreateHiveRequestSchema, UpdateHiveRequestSchema } from "../schemas/hive.schemas.js";
import { HiveService } from "../services/hive.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const hiveService = new HiveService(
  new HiveRepository(),
  new UserRepository(),
);

interface HiveRouteParams {
  hiveId: string;
}

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

hiveRouter.put("/:hiveId", asyncHandler<HiveRouteParams>(async (req, res) => {
  const input = UpdateHiveRequestSchema.parse(req.body);

  const result = await hiveService.updateForAuthenticatedUser({
    authenticatedUserId: req.authenticatedUserId!,
    hiveId: req.params.hiveId,
    name: input.name,
    status: input.status,
  });

  res.status(200).json(result);
}));
