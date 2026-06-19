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
    hivesService.listHives.mockResolvedValue([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);

    await store.loadHives();

    expect(store.hives()).toEqual([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    expect(store.hasHives()).toBe(true);
    expect(store.error()).toBeNull();
    expect(store.isLoading()).toBe(false);
  });

  it("sets an error when loading hives fails", async () => {
    hivesService.listHives.mockResolvedValueOnce([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    await store.loadHives();

    hivesService.listHives.mockRejectedValue({
      error: { message: "Could not load hives" },
    });

    await store.loadHives();

    expect(store.hives()).toEqual([]);
    expect(store.hasHives()).toBe(false);
    expect(store.error()).toBe("Could not load hives");
    expect(store.isLoading()).toBe(false);
  });

  it("appends a created hive", async () => {
    hivesService.listHives.mockResolvedValue([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    hivesService.createHive.mockResolvedValue({
      hiveId: "hive-2",
      name: "South Field",
      status: false,
    });

    await store.loadHives();
    await store.createHive({ name: "South Field", status: false });

    expect(store.hives()).toEqual([
      { hiveId: "hive-1", name: "North Field", status: true },
      { hiveId: "hive-2", name: "South Field", status: false },
    ]);
    expect(store.createError()).toBeNull();
    expect(store.isCreating()).toBe(false);
  });

  it("sets create errors and rethrows when create fails", async () => {
    const error = { error: { message: "Hive name already exists" } };

    hivesService.createHive.mockRejectedValue(error);

    await expect(store.createHive({ name: "North Field", status: true })).rejects.toBe(error);
    expect(store.createError()).toBe("Hive name already exists");
    expect(store.isCreating()).toBe(false);
  });
});
