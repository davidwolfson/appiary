import { describe, expect, it } from "vitest";

import { CreateHiveRequestSchema } from "../../../src/schemas/hive.schemas.js";

describe("CreateHiveRequestSchema", () => {
  it("accepts valid input and trims the name", () => {
    // given valid hive input with surrounding whitespace
    const input = {
      name: "  North Field  ",
      status: true,
    };

    // when the input is parsed
    const result = CreateHiveRequestSchema.parse(input);

    // then the name is trimmed
    expect(result).toEqual({
      name: "North Field",
      status: true,
    });
  });

  it.each(["", "   "])("rejects the invalid name %j", (name) => {
    // given hive input with an empty name
    const input = { name, status: true };

    // when the input is parsed
    const result = CreateHiveRequestSchema.safeParse(input);

    // then validation fails
    expect(result.success).toBe(false);
  });

  it("rejects names longer than 100 characters", () => {
    // given hive input with an overlong name
    const input = {
      name: "a".repeat(101),
      status: true,
    };

    // when the input is parsed
    const parsed = CreateHiveRequestSchema.safeParse(input);

    // then validation reports the length constraint
    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.name).toContain("Hive name must be 100 characters or fewer");
  });

  it.each([
    { name: "North Field" },
    { name: "North Field", status: "active" },
  ])("rejects the invalid status in %j", (input) => {
    // given hive input with an invalid status
    // when the input is parsed
    const result = CreateHiveRequestSchema.safeParse(input);

    // then validation fails
    expect(result.success).toBe(false);
  });
});
