import { describe, expect, it } from "vitest";

import { mapToApiaryResponse } from "../../../src/mappers/apiary.mapper.js";

describe("mapToApiaryResponse", () => {
  it("maps the public apiary contract", () => {
    // given an apiary service result
    const result = { apiaryId: "apiary-1", name: "North Yard", status: false };

    // when the result is mapped
    const response = mapToApiaryResponse(result);

    // then every public field is returned
    expect(response).toEqual(result);
  });
});
