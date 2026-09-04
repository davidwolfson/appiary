import { describe, expect, it } from "vitest";

import { CreateApiaryRequestSchema } from "../../../src/schemas/apiary.schemas.js";

describe("CreateApiaryRequestSchema", () => {
  it.each([
    ["empty", ""],
    ["whitespace-only", "   "],
  ])("rejects %s names", (_description, name) => {
    // given an apiary name without visible characters
    // when the request is validated
    const result = CreateApiaryRequestSchema.safeParse({ name });

    // then validation rejects the request
    expect(result.success).toBe(false);
  });

  it("rejects names longer than 100 characters after trimming", () => {
    // given an apiary name with 101 visible characters
    // when the request is validated
    const result = CreateApiaryRequestSchema.safeParse({ name: `  ${"a".repeat(101)}  ` });

    // then validation rejects the request
    expect(result.success).toBe(false);
  });

  it("accepts and trims a name of up to 100 characters", () => {
    // given a padded apiary name at the maximum length
    const name = "a".repeat(100);

    // when the request is validated
    const result = CreateApiaryRequestSchema.parse({ name: `  ${name}  ` });

    // then the normalized name is returned
    expect(result).toEqual({ name });
  });
});
