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
    // given the dashboard fixture is created
    // when the initial dashboard view renders
    // then the store is asked to load hives
    expect(hivesStore.loadHives).toHaveBeenCalled();
  });

  it("displays loading state", () => {
    // given the hives store reports that loading is active
    loadingState.set(true);

    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then the loading message is visible
    expect(fixture.nativeElement.textContent).toContain("Loading hives...");
  });

  it("displays empty state", () => {
    // given the hives store contains no hives
    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then the empty-state message is visible
    expect(fixture.nativeElement.textContent).toContain("No hives yet");
  });

  it("renders one hive card per hive", () => {
    // given the store contains two hives
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
      { hiveId: "hive-2", name: "South Field", status: false },
    ]);
    hasHivesState.set(true);

    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then both hive cards are visible
    expect(fixture.nativeElement.textContent).toContain("North Field");
    expect(fixture.nativeElement.textContent).toContain("South Field");
  });

  it("opens the Add Hive modal from the Add Hive button", () => {
    // given the dashboard is rendered with the modal closed
    // when the Add Hive button is clicked
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    // then create errors are cleared and the modal opens
    expect(modalOpen()).not.toBeNull();
    expect(hivesStore.clearCreateError).toHaveBeenCalled();
  });

  it("passes successful modal submission to the store", async () => {
    // given the Add Hive modal is open
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    // when valid hive details are submitted
    const component = fixture.componentInstance as never as {
      createHive: (payload: { name: string; status: boolean }) => Promise<void>;
    };
    await component.createHive({ name: "North Field", status: true });
    fixture.detectChanges();

    // then the store creates the hive and the modal closes
    expect(hivesStore.createHive).toHaveBeenCalledWith({ name: "North Field", status: true });
    expect(modalOpen()).toBeNull();
  });

  it("reopens the Add Hive modal with a fresh form after successful create", async () => {
    // given a completed create has closed a populated Add Hive modal
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

    // when the Add Hive modal is opened again
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    // then the new form contains its default values
    expect((fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement).value).toBe("");
    expect((fixture.nativeElement.querySelector("#hive-status") as HTMLSelectElement).selectedOptions[0]?.textContent).toBe("Active");
  });

  it("displays load errors", () => {
    // given the hives store reports a load error
    errorState.set("Could not load hives");

    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then the load error is visible
    expect(fixture.nativeElement.textContent).toContain("Could not load hives");
  });

  it("does not render stale hive cards while a load error is visible", () => {
    // given the store has stale hives and a current load error
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    hasHivesState.set(true);
    errorState.set("Could not load hives");

    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then the error is shown without stale hive cards
    expect(fixture.nativeElement.textContent).toContain("Could not load hives");
    expect(fixture.nativeElement.textContent).not.toContain("North Field");
  });
});
