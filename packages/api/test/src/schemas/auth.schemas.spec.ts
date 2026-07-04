import { describe, expect, it } from "vitest";

import { LoginRequestSchema, RegisterRequestSchema } from "../../../src/schemas/auth.schemas.js";

describe("RegisterRequestSchema", () => {
  it("accepts valid input and trims string fields", () => {
    // given valid registration input with surrounding whitespace
    // when the input is parsed
    const result = RegisterRequestSchema.parse({
      accountName: "  Acme  ",
      email: "  user@example.com  ",
      password: "password123",
      confirmPassword: "password123",
    });

    // then string fields are trimmed
    expect(result).toEqual({
      accountName: "Acme",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
  });

  it("rejects mismatched passwords", () => {
    // given registration input with mismatched passwords
    // when the input is parsed
    const parsed = RegisterRequestSchema.safeParse({
      accountName: "Acme",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "different",
    });

    // then confirmation validation fails
    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.confirmPassword).toContain("Passwords must match");
  });

  it("rejects empty account names", () => {
    // given registration input with a blank account name
    // when the input is parsed
    const parsed = RegisterRequestSchema.safeParse({
      accountName: "   ",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    // then account-name validation fails
    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.accountName).toContain("Account name is required");
  });
});

describe("LoginRequestSchema", () => {
  it("accepts valid input and trims the email", () => {
    // given valid login input with surrounding whitespace
    // when the input is parsed
    const result = LoginRequestSchema.parse({
      email: "  user@example.com  ",
      password: "secret",
    });

    // then the email is trimmed
    expect(result).toEqual({
      email: "user@example.com",
      password: "secret",
    });
  });

  it("rejects invalid email addresses", () => {
    // given login input with an invalid email
    // when the input is parsed
    const parsed = LoginRequestSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });

    // then email validation fails
    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.email).toContain("Email must be valid");
  });
});
