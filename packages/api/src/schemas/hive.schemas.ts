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

const calendarDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Inspection date must use YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }, "Inspection date must be a valid calendar date");

export const CreateHiveInspectionRequestSchema = z.object({
  inspectionDate: calendarDateSchema,
  inspectionTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Inspection time must use HH:mm"),
  queenRight: z.boolean(),
  eggs: z.boolean(),
  larva: z.boolean(),
  cappedBrood: z.boolean(),
  broodPattern: z.enum(["good", "fair", "poor", "na"]).nullish().transform((value) => value ?? null),
  additionalNotes: z.string().nullish().transform((value) => value ?? null),
});
