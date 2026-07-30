import { Router } from "express";

import { mapToHiveResponse } from "../mappers/hive.mapper.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { HiveRepository } from "../repositories/hive.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import {
  CreateHiveRequestSchema,
  HiveRouteParamsSchema,
  UpdateHiveRequestSchema,
} from "../schemas/hive.schemas.js";
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

  res.status(200).json({
    hives: result.hives.map(mapToHiveResponse),
  });
}));

hiveRouter.post("/", asyncHandler(async (req, res) => {
  const input = CreateHiveRequestSchema.parse(req.body);

  const result = await hiveService.createForAuthenticatedUser({
    authenticatedUserId: req.authenticatedUserId!,
    name: input.name,
    status: input.status,
  });

  res.status(201).json({
    hive: mapToHiveResponse(result.hive),
  });
}));

hiveRouter.put("/:hiveId", asyncHandler<HiveRouteParams>(async (req, res) => {
  const params = HiveRouteParamsSchema.parse(req.params);
  const input = UpdateHiveRequestSchema.parse(req.body);

  const result = await hiveService.updateForAuthenticatedUser({
    authenticatedUserId: req.authenticatedUserId!,
    hiveId: params.hiveId,
    name: input.name,
    status: input.status,
  });

  res.status(200).json({
    hive: mapToHiveResponse(result.hive),
  });
}));
