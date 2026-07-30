import { describe, expect, it } from "vitest";

import { mapToHiveResponse } from "../../../src/mappers/hive.mapper.js";

describe("mapToHiveResponse", () => {
  it("maps a service result to the public hive response", () => {
    // given a service result with public fields and backend-only data
    const result = {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
      accountId: "account-1",
    };

    // when the result is mapped for the API
    const response = mapToHiveResponse(result);

    // then only the public response fields are returned
    expect(response).toEqual({
      hiveId: "hive-1",
      name: "North Field",
      status: true,
    });
  });
});
