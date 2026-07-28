import { describe, expect, it } from "vitest";

import {
  CreateHiveRequestSchema,
  HiveRouteParamsSchema,
  UpdateHiveRequestSchema,
} from "../../../src/schemas/hive.schemas.js";

describe("HiveRouteParamsSchema", () => {
  it("accepts a valid hive UUID", () => {
    // given valid hive route parameters
    const input = { hiveId: "37a9a6dc-3030-4be5-9694-f65c5c5f6d1e" };

    // when the parameters are parsed
    const result = HiveRouteParamsSchema.parse(input);

    // then the hive ID is returned
    expect(result).toEqual(input);
  });

  it.each([
    {},
    { hiveId: "not-a-uuid" },
  ])("rejects invalid hive route parameters in %j", (input) => {
    // given invalid hive route parameters
    // when the parameters are parsed
    const result = HiveRouteParamsSchema.safeParse(input);

    // then validation fails
    expect(result.success).toBe(false);
  });
});

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

describe("UpdateHiveRequestSchema", () => {
  it("accepts valid input and trims the name", () => {
    // given valid hive update input with surrounding whitespace
    const input = {
      name: "  South Field  ",
      status: false,
    };

    // when the input is parsed
    const result = UpdateHiveRequestSchema.parse(input);

    // then the name is trimmed
    expect(result).toEqual({
      name: "South Field",
      status: false,
    });
  });

  it.each(["", "   "])("rejects the invalid name %j", (name) => {
    // given hive update input with an empty name
    const input = { name, status: true };

    // when the input is parsed
    const result = UpdateHiveRequestSchema.safeParse(input);

    // then validation fails
    expect(result.success).toBe(false);
  });

  it("rejects names longer than 100 characters", () => {
    // given hive update input with an overlong name
    const input = {
      name: "a".repeat(101),
      status: true,
    };

    // when the input is parsed
    const parsed = UpdateHiveRequestSchema.safeParse(input);

    // then validation reports the length constraint
    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.name).toContain("Hive name must be 100 characters or fewer");
  });

  it.each([
    { name: "South Field" },
    { name: "South Field", status: "active" },
  ])("rejects the invalid status in %j", (input) => {
    // given hive update input with an invalid status
    // when the input is parsed
    const result = UpdateHiveRequestSchema.safeParse(input);

    // then validation fails
    expect(result.success).toBe(false);
  });
});
