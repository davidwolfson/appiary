import { describe, expect, it } from "vitest";

import { signAuthToken, verifyAuthToken } from "../../../src/utils/jwt.js";

describe("jwt utils", () => {
  it("signs a token with the expected subject and a generated jti", () => {
    const token = signAuthToken("user-123");
    const payload = verifyAuthToken(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.jti).toEqual(expect.any(String));
    expect(payload.exp).toEqual(expect.any(Number));
  });

  it("rejects invalid tokens", () => {
    expect(() => verifyAuthToken("invalid-token")).toThrow();
  });
});
