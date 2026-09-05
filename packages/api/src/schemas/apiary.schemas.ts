import { z } from "zod";

export const CreateApiaryRequestSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Apiary name is required")
    .max(100, "Apiary name must be 100 characters or fewer"),
});
