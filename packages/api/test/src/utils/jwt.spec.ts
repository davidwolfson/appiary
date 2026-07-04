import { describe, expect, it } from "vitest";

import { signAuthToken, verifyAuthToken } from "../../../src/utils/jwt.js";

describe("jwt utils", () => {
  it("signs a token with the expected subject and a generated jti", () => {
    // given a user needs an auth token
    // when the token is signed and decoded
    const token = signAuthToken("user-123");
    const payload = verifyAuthToken(token);

    // then the payload contains the user subject and a token identifier
    expect(payload.sub).toBe("user-123");
    expect(payload.jti).toEqual(expect.any(String));
    expect(payload.exp).toEqual(expect.any(Number));
  });

  it("rejects invalid tokens", () => {
    // given a malformed auth token is provided
    // when the token is verified
    // then verification rejects the token
    expect(() => verifyAuthToken("invalid-token")).toThrow();
  });
});
