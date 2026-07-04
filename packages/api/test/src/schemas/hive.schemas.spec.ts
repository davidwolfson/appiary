import { describe, expect, it } from "vitest";

import { CreateHiveRequestSchema } from "../../../src/schemas/hive.schemas.js";

describe("CreateHiveRequestSchema", () => {
  it("accepts valid input and trims the name", () => {
    const result = CreateHiveRequestSchema.parse({
      name: "  North Field  ",
      status: true,
    });

    expect(result).toEqual({
      name: "North Field",
      status: true,
    });
  });

  it("rejects empty and whitespace-only names", () => {
    expect(CreateHiveRequestSchema.safeParse({ name: "", status: true }).success).toBe(false);
    expect(CreateHiveRequestSchema.safeParse({ name: "   ", status: true }).success).toBe(false);
  });

  it("rejects names longer than 100 characters", () => {
    const parsed = CreateHiveRequestSchema.safeParse({
      name: "a".repeat(101),
      status: true,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.name).toContain("Hive name must be 100 characters or fewer");
  });

  it("rejects missing or non-boolean status values", () => {
    expect(CreateHiveRequestSchema.safeParse({ name: "North Field" }).success).toBe(false);
    expect(CreateHiveRequestSchema.safeParse({ name: "North Field", status: "active" }).success).toBe(false);
  });
});
