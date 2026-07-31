import type { HiveResponse } from "@appiary/types";

import { mapToHiveViewModel } from "./hives.mapper";

describe("hives mapper", () => {
  it("maps nested inspections including nullable fields", () => {
    // given a hive response contains a nested inspection with null values
    const hive: HiveResponse = { hiveId: "hive-1", name: "North Field", status: true, inspections: [{ inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-30", inspectionTime: "09:15", queenRight: true, eggs: false, larva: true, cappedBrood: false, broodPattern: null, additionalNotes: null }] };

    // when it is mapped for the UI
    const result = mapToHiveViewModel(hive);

    // then the nested values and nulls are preserved in a distinct object
    expect(result).toEqual(hive);
    expect(result).not.toBe(hive);
    expect(result.inspections[0]).not.toBe(hive.inspections[0]);
  });

  it("normalizes a missing inspection collection", () => {
    // given an older API payload omits inspections
    const hive = { hiveId: "hive-1", name: "North Field", status: true } as HiveResponse;

    // when it is mapped for the UI
    const result = mapToHiveViewModel(hive);

    // then consumers receive an empty collection
    expect(result.inspections).toEqual([]);
  });
});
