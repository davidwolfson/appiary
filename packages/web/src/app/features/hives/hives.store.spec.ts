import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { vi } from "vitest";

import { HivesService } from "./hives.service";
import { HivesStore } from "./hives.store";

describe("HivesStore", () => {
  let store: HivesStore;
  let hivesService: {
    createInspection: ReturnType<typeof vi.fn>;
    createHive: ReturnType<typeof vi.fn>;
    listHives: ReturnType<typeof vi.fn>;
    updateHive: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    hivesService = {
      createInspection: vi.fn(),
      createHive: vi.fn(),
      listHives: vi.fn(),
      updateHive: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        HivesStore,
        { provide: HivesService, useValue: hivesService },
      ],
    });

    store = TestBed.inject(HivesStore);
  });

  it("loads hives and updates state", async () => {
    // given the hives service returns a hive
    hivesService.listHives.mockResolvedValue([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);

    // when the store loads hives
    await store.loadHives();

    // then hive, loading, and error state reflect success
    expect(store.hives()).toEqual([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    expect(store.hasHives()).toBe(true);
    expect(store.error()).toBeNull();
    expect(store.isLoading()).toBe(false);
  });

  it("sets an error when loading hives fails", async () => {
    // given the store has stale hives and the next load will fail
    hivesService.listHives.mockResolvedValueOnce([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    await store.loadHives();

    hivesService.listHives.mockRejectedValue({
      error: { message: "Could not load hives" },
    });

    // when the store reloads hives
    await store.loadHives();

    // then stale hives are cleared and the load error is exposed
    expect(store.hives()).toEqual([]);
    expect(store.hasHives()).toBe(false);
    expect(store.error()).toBe("Could not load hives");
    expect(store.isLoading()).toBe(false);
  });

  it("appends a created hive", async () => {
    // given the store contains one hive and creation will return another
    hivesService.listHives.mockResolvedValue([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    hivesService.createHive.mockResolvedValue({
      hiveId: "hive-2",
      name: "South Field",
      status: false,
    });

    // when the store creates a hive
    await store.loadHives();
    await store.createHive({ name: "South Field", status: false });

    // then the created hive is appended and create state is cleared
    expect(store.hives()).toEqual([
      { hiveId: "hive-1", name: "North Field", status: true },
      { hiveId: "hive-2", name: "South Field", status: false },
    ]);
    expect(store.createError()).toBeNull();
    expect(store.isCreating()).toBe(false);
  });

  it("sets create errors and rethrows when create fails", async () => {
    // given the hives service rejects creation with an API message
    const error = { error: { message: "Hive name already exists" } };

    hivesService.createHive.mockRejectedValue(error);

    // when the store creates a hive
    const result = store.createHive({ name: "North Field", status: true });

    // then the rejection propagates and create error state is set
    await expect(result).rejects.toBe(error);
    expect(store.createError()).toBe("Hive name already exists");
    expect(store.isCreating()).toBe(false);
  });

  it("replaces an updated hive without changing list order", async () => {
    // given the store contains two hives and update returns one changed hive with its inspections
    const inspection = {
      inspectionId: "inspection-1",
      hiveId: "hive-1",
      inspectionDate: "2026-07-31",
      inspectionTime: "14:30",
      queenRight: true,
      eggs: true,
      larva: true,
      cappedBrood: false,
      broodPattern: "good" as const,
      additionalNotes: "Healthy colony",
    };
    hivesService.listHives.mockResolvedValue([
      { hiveId: "hive-1", name: "North Field", status: true, inspections: [inspection] },
      { hiveId: "hive-2", name: "South Field", status: false, inspections: [] },
    ]);
    hivesService.updateHive.mockResolvedValue({
      hiveId: "hive-1",
      name: "North Field Updated",
      status: false,
      inspections: [inspection],
    });

    // when the store updates the first hive
    await store.loadHives();
    await store.updateHive("hive-1", { name: "North Field Updated", status: false });

    // then the matching hive is replaced in its original position
    expect(store.hives()).toEqual([
      { hiveId: "hive-1", name: "North Field Updated", status: false, inspections: [inspection] },
      { hiveId: "hive-2", name: "South Field", status: false, inspections: [] },
    ]);
    expect(hivesService.updateHive).toHaveBeenCalledWith("hive-1", {
      name: "North Field Updated",
      status: false,
    });
    expect(store.updateError()).toBeNull();
    expect(store.isUpdating()).toBe(false);
  });

  it("sets update errors and rethrows when update fails", async () => {
    // given the hives service rejects update with an API message
    const error = { error: { message: "Hive name already exists" } };

    hivesService.updateHive.mockRejectedValue(error);

    // when the store updates a hive
    const result = store.updateHive("hive-1", { name: "North Field", status: true });

    // then the rejection propagates and update error state is set
    await expect(result).rejects.toBe(error);
    expect(store.updateError()).toBe("Hive name already exists");
    expect(store.isUpdating()).toBe(false);
  });

  it("clears update errors", async () => {
    // given the store has an update error
    hivesService.updateHive.mockRejectedValue({
      error: { message: "Hive name already exists" },
    });
    await expect(store.updateHive("hive-1", { name: "North Field", status: true })).rejects.toBeDefined();

    // when the update error is cleared
    store.clearUpdateError();

    // then the update error is no longer exposed
    expect(store.updateError()).toBeNull();
  });

  it("adds an inspection only to its hive and caps history at five", async () => {
    // given two hives exist and one already has five inspections
    const inspection = (id: string) => ({ inspectionId: id, hiveId: "hive-1", inspectionDate: "2026-07-31", inspectionTime: "12:00", queenRight: false, eggs: false, larva: false, cappedBrood: false, broodPattern: null, additionalNotes: null });
    hivesService.listHives.mockResolvedValue([{ hiveId: "hive-1", name: "North", status: true, inspections: [1, 2, 3, 4, 5].map((id) => inspection(String(id))) }, { hiveId: "hive-2", name: "South", status: true, inspections: [] }]);
    hivesService.createInspection.mockResolvedValue(inspection("new"));
    await store.loadHives();
    const untouchedHive = store.hives()[1];

    // when a new inspection is saved
    await store.createInspection("hive-1", { inspectionDate: "2026-07-31", inspectionTime: "12:00", queenRight: false, eggs: false, larva: false, cappedBrood: false });

    // then only the target hive changes and its newest five are retained
    expect(store.hives()[0].inspections.map(({ inspectionId }) => inspectionId)).toEqual(["new", "1", "2", "3", "4"]);
    expect(store.hives()[1]).toBe(untouchedHive);
    expect(store.isSavingInspection()).toBe(false);
    expect(store.inspectionError()).toBeNull();
  });

  it("preserves hive state and exposes inspection save failures", async () => {
    // given loaded state and a rejected inspection request
    const hives = [{ hiveId: "hive-1", name: "North", status: true, inspections: [] }];
    const error = { error: { message: "Could not save inspection" } };
    hivesService.listHives.mockResolvedValue(hives);
    hivesService.createInspection.mockRejectedValue(error);
    await store.loadHives();

    // when an inspection save fails
    const result = store.createInspection("hive-1", { inspectionDate: "2026-07-31", inspectionTime: "12:00", queenRight: false, eggs: false, larva: false, cappedBrood: false });

    // then the failure propagates without mutating hives
    await expect(result).rejects.toBe(error);
    expect(store.hives()).toEqual(hives);
    expect(store.inspectionError()).toBe("Could not save inspection");
  });
});
