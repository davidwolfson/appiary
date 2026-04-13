import { describe, expect, it } from "vitest";

import { LoginRequestSchema, RegisterRequestSchema } from "../src/schemas/auth.schemas.js";

describe("RegisterRequestSchema", () => {
  it("accepts valid input and trims string fields", () => {
    const result = RegisterRequestSchema.parse({
      accountName: "  Acme  ",
      email: "  user@example.com  ",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result).toEqual({
      accountName: "Acme",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
  });

  it("rejects mismatched passwords", () => {
    const parsed = RegisterRequestSchema.safeParse({
      accountName: "Acme",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "different",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.confirmPassword).toContain("Passwords must match");
  });

  it("rejects empty account names", () => {
    const parsed = RegisterRequestSchema.safeParse({
      accountName: "   ",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.accountName).toContain("Account name is required");
  });
});

describe("LoginRequestSchema", () => {
  it("accepts valid input and trims the email", () => {
    const result = LoginRequestSchema.parse({
      email: "  user@example.com  ",
      password: "secret",
    });

    expect(result).toEqual({
      email: "user@example.com",
      password: "secret",
    });
  });

  it("rejects invalid email addresses", () => {
    const parsed = LoginRequestSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.email).toContain("Email must be valid");
  });
});
