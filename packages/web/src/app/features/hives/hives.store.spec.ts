import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { vi } from "vitest";

import { HivesService } from "./hives.service";
import { HivesStore } from "./hives.store";

describe("HivesStore", () => {
  let store: HivesStore;
  let hivesService: {
    createHive: ReturnType<typeof vi.fn>;
    listHives: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    hivesService = {
      createHive: vi.fn(),
      listHives: vi.fn(),
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
});
