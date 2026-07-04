import { provideZonelessChangeDetection, signal, type WritableSignal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { vi } from "vitest";

import { AuthStore } from "../auth/auth.store";
import { HivesDashboardComponent } from "./hives-dashboard.component";
import { HivesStore } from "./hives.store";

describe("HivesDashboardComponent", () => {
  let fixture: ComponentFixture<HivesDashboardComponent>;
  let hivesState: WritableSignal<{ hiveId: string; name: string; status: boolean }[]>;
  let loadingState: WritableSignal<boolean>;
  let errorState: WritableSignal<string | null>;
  let hasHivesState: WritableSignal<boolean>;
  let modalOpen: () => HTMLElement | null;
  let hivesStore: {
    clearCreateError: ReturnType<typeof vi.fn>;
    createError: ReturnType<typeof vi.fn>;
    createHive: ReturnType<typeof vi.fn>;
    error: () => string | null;
    hasHives: () => boolean;
    hives: () => { hiveId: string; name: string; status: boolean }[];
    isCreating: ReturnType<typeof vi.fn>;
    isLoading: () => boolean;
    loadHives: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    hivesState = signal<{ hiveId: string; name: string; status: boolean }[]>([]);
    loadingState = signal(false);
    errorState = signal<string | null>(null);
    hasHivesState = signal(false);
    hivesStore = {
      clearCreateError: vi.fn(),
      createError: vi.fn(() => null),
      createHive: vi.fn().mockResolvedValue(undefined),
      error: () => errorState(),
      hasHives: () => hasHivesState(),
      hives: () => hivesState(),
      isCreating: vi.fn(() => false),
      isLoading: () => loadingState(),
      loadHives: vi.fn().mockResolvedValue(undefined),
    };
    modalOpen = () => fixture.nativeElement.querySelector("[role='dialog']");

    await TestBed.configureTestingModule({
      imports: [HivesDashboardComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AuthStore,
          useValue: {
            isLoading: vi.fn(() => false),
            logout: vi.fn().mockResolvedValue(undefined),
            user: vi.fn(() => ({
              email: "beekeeper@example.com",
              accountName: "Apiary",
            })),
          },
        },
        { provide: HivesStore, useValue: hivesStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HivesDashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it("loads hives on render", () => {
    expect(hivesStore.loadHives).toHaveBeenCalled();
  });

  it("displays loading state", () => {
    loadingState.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Loading hives...");
  });

  it("displays empty state", () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("No hives yet");
  });

  it("renders one hive card per hive", () => {
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
      { hiveId: "hive-2", name: "South Field", status: false },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("North Field");
    expect(fixture.nativeElement.textContent).toContain("South Field");
  });

  it("opens the Add Hive modal from the Add Hive button", () => {
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    expect(modalOpen()).not.toBeNull();
    expect(hivesStore.clearCreateError).toHaveBeenCalled();
  });

  it("passes successful modal submission to the store", async () => {
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    const component = fixture.componentInstance as never as {
      createHive: (payload: { name: string; status: boolean }) => Promise<void>;
    };
    await component.createHive({ name: "North Field", status: true });
    fixture.detectChanges();

    expect(hivesStore.createHive).toHaveBeenCalledWith({ name: "North Field", status: true });
    expect(modalOpen()).toBeNull();
  });

  it("reopens the Add Hive modal with a fresh form after successful create", async () => {
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement;
    const statusSelect = fixture.nativeElement.querySelector("#hive-status") as HTMLSelectElement;
    nameInput.value = "North Field";
    nameInput.dispatchEvent(new Event("input"));
    statusSelect.selectedIndex = 1;
    statusSelect.dispatchEvent(new Event("change"));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit"));
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement).value).toBe("");
    expect((fixture.nativeElement.querySelector("#hive-status") as HTMLSelectElement).selectedOptions[0]?.textContent).toBe("Active");
  });

  it("displays load errors", () => {
    errorState.set("Could not load hives");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Could not load hives");
  });

  it("does not render stale hive cards while a load error is visible", () => {
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    hasHivesState.set(true);
    errorState.set("Could not load hives");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Could not load hives");
    expect(fixture.nativeElement.textContent).not.toContain("North Field");
  });
});
