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
    listInspections: ReturnType<typeof vi.fn>;
    listHives: ReturnType<typeof vi.fn>;
    updateHive: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    hivesService = {
      createInspection: vi.fn(),
      createHive: vi.fn(),
      listInspections: vi.fn(),
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

  it("adds an inspection only to its hive and preserves complete history", async () => {
    // given two hives exist and one already has five inspections
    const inspection = (id: string) => ({ inspectionId: id, hiveId: "hive-1", inspectionDate: "2026-07-31", inspectionTime: "12:00", queenRight: false, eggs: false, larva: false, cappedBrood: false, broodPattern: null, additionalNotes: null });
    hivesService.listHives.mockResolvedValue([{ hiveId: "hive-1", name: "North", status: true, inspections: [1, 2, 3, 4, 5].map((id) => inspection(String(id))) }, { hiveId: "hive-2", name: "South", status: true, inspections: [] }]);
    hivesService.createInspection.mockResolvedValue(inspection("new"));
    await store.loadHives();
    const untouchedHive = store.hives()[1];

    // when a new inspection is saved
    await store.createInspection("hive-1", { inspectionDate: "2026-07-31", inspectionTime: "12:00", queenRight: false, eggs: false, larva: false, cappedBrood: false });

    // then only the target hive changes and all inspections are retained newest-first
    expect(store.hives()[0].inspections.map(({ inspectionId }) => inspectionId)).toEqual(["new", "1", "2", "3", "4", "5"]);
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

  it("loads an inspection page and replaces only the target hive", async () => {
    // given two hives are loaded and the target page request is deferred
    const firstPageInspection = { inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-30", inspectionTime: "12:00", queenRight: true, eggs: true, larva: true, cappedBrood: true, broodPattern: null, additionalNotes: null };
    const otherInspection = { ...firstPageInspection, inspectionId: "other-inspection-1", hiveId: "hive-2" };
    const secondPageInspection = { ...firstPageInspection, inspectionId: "inspection-6", inspectionDate: "2026-07-25" };
    hivesService.listHives.mockResolvedValue([
      { hiveId: "hive-1", name: "North", status: true, inspections: [firstPageInspection], inspectionPagination: { page: 1, pageSize: 5, totalItems: 6, totalPages: 2 } },
      { hiveId: "hive-2", name: "South", status: true, inspections: [otherInspection], inspectionPagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 } },
    ]);
    await store.loadHives();
    const targetHiveBefore = store.hives()[0];
    const otherHiveBefore = store.hives()[1];
    let resolvePage!: (value: { inspections: (typeof secondPageInspection)[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }) => void;
    hivesService.listInspections.mockReturnValue(new Promise((resolve) => { resolvePage = resolve; }));

    // when page two is requested and then resolves
    const loadingPage = store.loadInspectionPage("hive-1", 2);
    expect(store.isLoadingInspectionPage("hive-1")).toBe(true);
    expect(store.isLoadingInspectionPage("hive-2")).toBe(false);
    resolvePage({ inspections: [secondPageInspection], pagination: { page: 2, pageSize: 5, totalItems: 6, totalPages: 2 } });
    await loadingPage;

    // then only the target hive is replaced and loading state is cleared
    expect(hivesService.listInspections).toHaveBeenCalledWith("hive-1", 2);
    expect(store.hives()[0]).not.toBe(targetHiveBefore);
    expect(store.hives()[0]).toEqual({
      ...targetHiveBefore,
      inspections: [secondPageInspection],
      inspectionPagination: { page: 2, pageSize: 5, totalItems: 6, totalPages: 2 },
    });
    expect(store.hives()[1]).toBe(otherHiveBefore);
    expect(store.inspectionError()).toBeNull();
    expect(store.isLoadingInspectionPage("hive-1")).toBe(false);
    expect(store.inspectionPaginationFailure("hive-1")).toBeNull();
  });

  it("preserves hive pages and records only the target pagination failure", async () => {
    // given two loaded hives, an existing modal error, and a rejected page request
    const hives = [{
      hiveId: "hive-1", name: "North", status: true, inspections: [{ inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-30", inspectionTime: "12:00", queenRight: true, eggs: true, larva: true, cappedBrood: true, broodPattern: null, additionalNotes: null }],
      inspectionPagination: { page: 1, pageSize: 5, totalItems: 6, totalPages: 2 },
    }, {
      hiveId: "hive-2", name: "South", status: true, inspections: [],
      inspectionPagination: { page: 1, pageSize: 5, totalItems: 0, totalPages: 0 },
    }];
    hivesService.listHives.mockResolvedValue(hives);
    hivesService.createInspection.mockRejectedValue({ error: { message: "Could not save inspection" } });
    hivesService.listInspections.mockRejectedValue({ error: { message: "Could not load inspections" } });
    await store.loadHives();
    await expect(store.createInspection("hive-1", { inspectionDate: "2026-07-31", inspectionTime: "12:00", queenRight: false, eggs: false, larva: false, cappedBrood: false })).rejects.toBeDefined();
    const hiveBefore = store.hives()[0];
    const otherHiveBefore = store.hives()[1];

    // when page two fails to load
    await store.loadInspectionPage("hive-1", 2);

    // then both hives remain stable and only the target has the exact pagination failure
    expect(hivesService.listInspections).toHaveBeenCalledWith("hive-1", 2);
    expect(store.hives()[0]).toBe(hiveBefore);
    expect(store.hives()[1]).toBe(otherHiveBefore);
    expect(store.inspectionPaginationFailure("hive-1")).toEqual({ message: "Could not load inspections", page: 2 });
    expect(store.inspectionPaginationFailure("hive-2")).toBeNull();
    expect(store.isLoadingInspectionPage("hive-1")).toBe(false);
    expect(store.inspectionError()).toBe("Could not save inspection");
  });

  it("retries the exact failed page and clears only its failure", async () => {
    // given one hive failed page three while another hive also has a failure
    const inspection = { inspectionId: "inspection-3", hiveId: "hive-1", inspectionDate: "2026-07-20", inspectionTime: "12:00", queenRight: true, eggs: true, larva: true, cappedBrood: true, broodPattern: null, additionalNotes: null };
    hivesService.listHives.mockResolvedValue([
      { hiveId: "hive-1", name: "North", status: true, inspections: [], inspectionPagination: { page: 1, pageSize: 5, totalItems: 11, totalPages: 3 } },
      { hiveId: "hive-2", name: "South", status: true, inspections: [], inspectionPagination: { page: 1, pageSize: 5, totalItems: 6, totalPages: 2 } },
    ]);
    await store.loadHives();
    hivesService.listInspections.mockRejectedValueOnce({ error: { message: "North failed" } });
    await store.loadInspectionPage("hive-1", 3);
    hivesService.listInspections.mockRejectedValueOnce({ error: { message: "South failed" } });
    await store.loadInspectionPage("hive-2", 2);
    let resolveRetry!: (value: unknown) => void;
    hivesService.listInspections.mockReturnValueOnce(new Promise((resolve) => { resolveRetry = resolve; }));

    // when the first hive retries and its request resolves
    const retry = store.retryInspectionPage("hive-1");
    const retryStartState = {
      isLoading: store.isLoadingInspectionPage("hive-1"),
      failure: store.inspectionPaginationFailure("hive-1"),
    };
    resolveRetry({ inspections: [inspection], pagination: { page: 3, pageSize: 5, totalItems: 11, totalPages: 3 } });
    await retry;

    // then page three is requested again and the other hive's failure remains
    expect(retryStartState).toEqual({ isLoading: true, failure: null });
    expect(hivesService.listInspections).toHaveBeenLastCalledWith("hive-1", 3);
    expect(store.hives()[0].inspections).toEqual([inspection]);
    expect(store.hives()[0].inspectionPagination?.page).toBe(3);
    expect(store.inspectionPaginationFailure("hive-1")).toBeNull();
    expect(store.inspectionPaginationFailure("hive-2")).toEqual({ message: "South failed", page: 2 });
  });

  it("settles concurrent hive page requests independently in reverse order", async () => {
    // given two hives and independently deferred page requests
    const firstInspection = { inspectionId: "inspection-6", hiveId: "hive-1", inspectionDate: "2026-07-25", inspectionTime: "12:00", queenRight: true, eggs: true, larva: true, cappedBrood: true, broodPattern: null, additionalNotes: null };
    const secondInspection = { ...firstInspection, inspectionId: "other-inspection-6", hiveId: "hive-2" };
    hivesService.listHives.mockResolvedValue([
      { hiveId: "hive-1", name: "North", status: true, inspections: [], inspectionPagination: { page: 1, pageSize: 5, totalItems: 6, totalPages: 2 } },
      { hiveId: "hive-2", name: "South", status: true, inspections: [], inspectionPagination: { page: 1, pageSize: 5, totalItems: 6, totalPages: 2 } },
    ]);
    await store.loadHives();
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    hivesService.listInspections
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));

    // when both requests start and the second hive settles first
    const firstRequest = store.loadInspectionPage("hive-1", 2);
    const secondRequest = store.loadInspectionPage("hive-2", 2);
    resolveSecond({ inspections: [secondInspection], pagination: { page: 2, pageSize: 5, totalItems: 6, totalPages: 2 } });
    await secondRequest;
    const reverseSettlementState = {
      firstHiveLoading: store.isLoadingInspectionPage("hive-1"),
      secondHiveLoading: store.isLoadingInspectionPage("hive-2"),
      firstHivePage: store.hives()[0].inspectionPagination?.page,
      secondHiveInspections: store.hives()[1].inspections,
    };
    resolveFirst({ inspections: [firstInspection], pagination: { page: 2, pageSize: 5, totalItems: 6, totalPages: 2 } });
    await firstRequest;

    // then the first hive stayed loading until its own response settled
    expect(reverseSettlementState).toEqual({
      firstHiveLoading: true,
      secondHiveLoading: false,
      firstHivePage: 1,
      secondHiveInspections: [secondInspection],
    });
    expect(store.isLoadingInspectionPage("hive-1")).toBe(false);
    expect(store.hives()[0].inspections).toEqual([firstInspection]);
  });

  it("resets keyed inspection pagination state when hives reload", async () => {
    // given a hive has a stored pagination failure
    hivesService.listHives.mockResolvedValue([{ hiveId: "hive-1", name: "North", status: true, inspections: [] }]);
    hivesService.listInspections.mockRejectedValue({ error: { message: "Could not load inspections" } });
    await store.loadHives();
    await store.loadInspectionPage("hive-1", 2);

    // when hives reload
    await store.loadHives();

    // then stale keyed loading and failure state is removed
    expect(store.isLoadingInspectionPage("hive-1")).toBe(false);
    expect(store.inspectionPaginationFailure("hive-1")).toBeNull();
  });
});
