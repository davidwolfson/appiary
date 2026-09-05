import { Router } from "express";

import { mapToApiaryResponse } from "../mappers/apiary.mapper.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { ApiaryRepository } from "../repositories/apiary.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { CreateApiaryRequestSchema } from "../schemas/apiary.schemas.js";
import { ApiaryService } from "../services/apiary.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const apiaryService = new ApiaryService(
  new ApiaryRepository(),
  new UserRepository(),
);

export const apiaryRouter = Router();

apiaryRouter.use(requireAuth);

apiaryRouter.get("/", asyncHandler(async (req, res) => {
  const result = await apiaryService.listForAuthenticatedUser(req.authenticatedUserId!);

  res.status(200).json({
    apiaries: result.apiaries.map(mapToApiaryResponse),
  });
}));

apiaryRouter.post("/", asyncHandler(async (req, res) => {
  const input = CreateApiaryRequestSchema.parse(req.body);
  const result = await apiaryService.createForAuthenticatedUser({
    authenticatedUserId: req.authenticatedUserId!,
    name: input.name,
  });

  res.status(201).json({
    apiary: mapToApiaryResponse(result.apiary),
  });
}));
