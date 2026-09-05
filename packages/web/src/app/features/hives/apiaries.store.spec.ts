import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { vi } from "vitest";

import type { ApiaryViewModel } from "./apiaries.mapper";
import { ApiariesService } from "./apiaries.service";
import { ApiariesStore } from "./apiaries.store";
import { HivesStore } from "./hives.store";

describe("ApiariesStore", () => {
  let store: ApiariesStore;
  let service: { listApiaries: ReturnType<typeof vi.fn>; createApiary: ReturnType<typeof vi.fn> };
  let hivesStore: { loadHives: ReturnType<typeof vi.fn>; clearSelection: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { listApiaries: vi.fn(), createApiary: vi.fn() };
    hivesStore = { loadHives: vi.fn().mockResolvedValue(undefined), clearSelection: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ApiariesStore,
        { provide: ApiariesService, useValue: service },
        { provide: HivesStore, useValue: hivesStore },
      ],
    });
    store = TestBed.inject(ApiariesStore);
  });

  it("selects the first ID and loads its hives", async () => {
    // given the service returns apiaries out of ID order
    service.listApiaries.mockResolvedValue([
      { apiaryId: "apiary-b", name: "South", status: true },
      { apiaryId: "apiary-a", name: "North", status: false },
    ]);

    // when dashboard apiaries load
    await store.loadApiaries();

    // then the ordered first apiary is selected and scoped hives load
    expect(store.apiaries().map(({ apiaryId }) => apiaryId)).toEqual(["apiary-a", "apiary-b"]);
    expect(store.selectedApiaryId()).toBe("apiary-a");
    expect(hivesStore.loadHives).toHaveBeenCalledWith("apiary-a");
    expect(store.isLoading()).toBe(false);
  });

  it("does not request hives without an apiary", async () => {
    // given the account has no apiaries
    service.listApiaries.mockResolvedValue([]);

    // when dashboard apiaries load
    await store.loadApiaries();

    // then hive state is cleared without making a list request
    expect(store.selectedApiaryId()).toBeNull();
    expect(hivesStore.clearSelection).toHaveBeenCalledOnce();
    expect(hivesStore.loadHives).not.toHaveBeenCalled();
  });

  it("switches selection and loads only that apiary", async () => {
    // given two apiaries are loaded with the first selected
    service.listApiaries.mockResolvedValue([
      { apiaryId: "apiary-a", name: "North", status: true },
      { apiaryId: "apiary-b", name: "South", status: true },
    ]);
    await store.loadApiaries();
    hivesStore.loadHives.mockClear();

    // when the second apiary is selected
    await store.selectApiary("apiary-b");

    // then selection changes and its hive query is requested
    expect(store.selectedApiaryId()).toBe("apiary-b");
    expect(hivesStore.loadHives).toHaveBeenCalledWith("apiary-b");
  });

  it("selects and loads the first created apiary", async () => {
    // given no apiary is selected and creation succeeds
    service.createApiary.mockResolvedValue({ apiaryId: "apiary-a", name: "North", status: true });

    // when the first apiary is created
    await store.createApiary({ name: "North" });

    // then it becomes selected and its empty hive list is loaded
    expect(store.selectedApiaryId()).toBe("apiary-a");
    expect(hivesStore.loadHives).toHaveBeenCalledWith("apiary-a");
  });

  it("preserves selection after a later apiary is created", async () => {
    // given one apiary is already selected
    service.listApiaries.mockResolvedValue([{ apiaryId: "apiary-a", name: "North", status: true }]);
    await store.loadApiaries();
    hivesStore.loadHives.mockClear();
    service.createApiary.mockResolvedValue({ apiaryId: "apiary-b", name: "South", status: true });

    // when another apiary is created
    await store.createApiary({ name: "South" });

    // then it is added without changing or reloading the selection
    expect(store.apiaries().map(({ apiaryId }) => apiaryId)).toEqual(["apiary-a", "apiary-b"]);
    expect(store.selectedApiaryId()).toBe("apiary-a");
    expect(hivesStore.loadHives).not.toHaveBeenCalled();
  });

  it("preserves an apiary created while the initial list is loading", async () => {
    // given the initial apiary list remains in flight while creation succeeds
    let resolveList!: (apiaries: ApiaryViewModel[]) => void;
    service.listApiaries.mockReturnValue(new Promise<ApiaryViewModel[]>((resolve) => {
      resolveList = resolve;
    }));
    service.createApiary.mockResolvedValue({ apiaryId: "apiary-a", name: "North", status: true });
    const loadResult = store.loadApiaries();

    // when the apiary is created before the older empty list response resolves
    await store.createApiary({ name: "North" });
    resolveList([]);
    await loadResult;

    // then the created apiary and its selection are preserved
    expect(store.apiaries()).toEqual([{ apiaryId: "apiary-a", name: "North", status: true }]);
    expect(store.selectedApiaryId()).toBe("apiary-a");
    expect(hivesStore.clearSelection).not.toHaveBeenCalled();
  });

  it("ignores an initial list failure after an apiary is created", async () => {
    // given the initial apiary list remains in flight while creation succeeds
    let rejectList!: (error: unknown) => void;
    service.listApiaries.mockReturnValue(new Promise<ApiaryViewModel[]>((_resolve, reject) => {
      rejectList = reject;
    }));
    service.createApiary.mockResolvedValue({ apiaryId: "apiary-a", name: "North", status: true });
    const loadResult = store.loadApiaries();

    // when the apiary is created before the older list request fails
    await store.createApiary({ name: "North" });
    rejectList({ error: { message: "Could not load apiaries" } });
    await loadResult;

    // then the stale failure does not replace the successful created state
    expect(store.apiaries()).toEqual([{ apiaryId: "apiary-a", name: "North", status: true }]);
    expect(store.selectedApiaryId()).toBe("apiary-a");
    expect(store.error()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(hivesStore.clearSelection).not.toHaveBeenCalled();
  });

  it("exposes list and create errors separately", async () => {
    // given list and create requests fail with different messages
    service.listApiaries.mockRejectedValue({ error: { message: "Could not load apiaries" } });
    service.createApiary.mockRejectedValue({ error: { message: "Name exists" } });
    await store.loadApiaries();

    // when apiary creation is attempted
    const result = store.createApiary({ name: "North" });

    // then each error remains in its own state
    await expect(result).rejects.toBeDefined();
    expect(store.error()).toBe("Could not load apiaries");
    expect(store.createError()).toBe("Name exists");
    expect(store.isCreating()).toBe(false);
  });
});
