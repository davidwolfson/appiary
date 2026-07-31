import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/utils/database.js", () => ({ database: { query: queryMock } }));

import { HiveInspectionRepository } from "../../../src/repositories/hive-inspection.repository.js";

describe("HiveInspectionRepository", () => {
  beforeEach(() => queryMock.mockReset());

  it("inserts an inspection through an account-scoped hive selection", async () => {
    // given an owned hive produces an inserted inspection row
    const repository = new HiveInspectionRepository();
    queryMock.mockResolvedValue({ rows: [{
      inspection_id: "inspection-1", hive_id: "hive-1", inspection_date: "2026-07-31",
      inspection_time: "14:30:00", queen_right: true, eggs: false, larva: true, capped_brood: false,
      brood_pattern: "fair", additional_notes: "Calm colony", created_at: new Date(), updated_at: new Date(),
    }] });

    // when an inspection is created for the account
    const result = await repository.createForAccount({
      accountId: "account-1", hiveId: "hive-1", inspectionDate: "2026-07-31", inspectionTime: "14:30",
      queenRight: true, eggs: false, larva: true, cappedBrood: false, broodPattern: "fair",
      additionalNotes: "Calm colony",
    });

    // then the ownership predicate and normalized model are used
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("h.account_id = $1 AND h.hive_id = $2"),
      ["account-1", "hive-1", "2026-07-31", "14:30", true, false, true, false, "fair", "Calm colony"]);
    expect(result).toMatchObject({ inspectionId: "inspection-1", inspectionTime: "14:30" });
  });

  it("returns null without creating a row for a missing or foreign-owned hive", async () => {
    // given the scoped insert selects no hive
    const repository = new HiveInspectionRepository();
    queryMock.mockResolvedValue({ rows: [] });

    // when inspection creation is attempted
    const result = await repository.createForAccount({
      accountId: "account-1", hiveId: "foreign-hive", inspectionDate: "2026-07-31", inspectionTime: "14:30",
      queenRight: false, eggs: false, larva: false, cappedBrood: false, broodPattern: null, additionalNotes: null,
    });

    // then no inspection model is returned
    expect(result).toBeNull();
  });

  it("retrieves the latest five for all hives in one deterministic ranked query", async () => {
    // given inspection rows for two requested hives
    const repository = new HiveInspectionRepository();
    const base = { inspection_time: "09:00:00", queen_right: false, eggs: false, larva: false,
      capped_brood: false, brood_pattern: null, additional_notes: null, created_at: new Date(), updated_at: new Date() };
    queryMock.mockResolvedValue({ rows: [
      { ...base, inspection_id: "inspection-2", hive_id: "hive-1", inspection_date: "2026-07-31" },
      { ...base, inspection_id: "inspection-1", hive_id: "hive-2", inspection_date: "2026-07-30" },
    ] });

    // when latest inspections are loaded in bulk
    const result = await repository.findLatestForHiveIds(["hive-1", "hive-2", "hive-3"]);

    // then one windowed query caps each partition and empty hives remain represented
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("ROW_NUMBER() OVER"), [["hive-1", "hive-2", "hive-3"]]);
    expect(queryMock.mock.calls[0][0]).toContain("WHERE inspection_rank <= 5");
    expect(queryMock.mock.calls[0][0]).toContain("created_at DESC, inspection_id DESC");
    expect(result.get("hive-1")).toHaveLength(1);
    expect(result.get("hive-2")).toHaveLength(1);
    expect(result.get("hive-3")).toEqual([]);
  });

  it("does not query for an empty hive set", async () => {
    // given no hives need inspection history
    const repository = new HiveInspectionRepository();

    // when histories are requested
    const result = await repository.findLatestForHiveIds([]);

    // then an empty collection is returned without database access
    expect(result.size).toBe(0);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
