import { mapToApiaryViewModel } from "./apiaries.mapper";

describe("apiaries mapper", () => {
  it("maps apiary fields to a distinct view model", () => {
    // given an apiary response
    const apiary = { apiaryId: "apiary-1", name: "North Yard", status: true };

    // when it is mapped
    const result = mapToApiaryViewModel(apiary);

    // then all contract fields are preserved in a new object
    expect(result).toEqual(apiary);
    expect(result).not.toBe(apiary);
  });
});
