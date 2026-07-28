import { z } from "zod";

export const CreateHiveRequestSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Hive name is required")
    .max(100, "Hive name must be 100 characters or fewer"),
  status: z.boolean({
    required_error: "Status is required",
    invalid_type_error: "Status must be true or false",
  }),
});

export const UpdateHiveRequestSchema = CreateHiveRequestSchema;

export const HiveRouteParamsSchema = z.object({
  hiveId: z.string().uuid("Hive ID must be a valid UUID"),
});
