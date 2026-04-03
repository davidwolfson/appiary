import { z } from "zod";

import type { LoginRequest, RegisterRequest } from "@appiary/types";

export const RegisterRequestSchema: z.ZodType<RegisterRequest> = z.object({
  accountName: z.string().trim().min(1, "Account name is required").max(255, "Account name must be 255 characters or fewer"),
  email: z.string().trim().email("Email must be valid"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).superRefine((value, ctx) => {
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords must match",
    });
  }
});

export const LoginRequestSchema: z.ZodType<LoginRequest> = z.object({
  email: z.string().trim().email("Email must be valid"),
  password: z.string().min(1, "Password is required"),
});
