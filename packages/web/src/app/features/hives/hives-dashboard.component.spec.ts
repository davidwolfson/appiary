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
    clearUpdateError: ReturnType<typeof vi.fn>;
    createError: ReturnType<typeof vi.fn>;
    createHive: ReturnType<typeof vi.fn>;
    error: () => string | null;
    hasHives: () => boolean;
    hives: () => { hiveId: string; name: string; status: boolean }[];
    isCreating: ReturnType<typeof vi.fn>;
    isLoading: () => boolean;
    isUpdating: ReturnType<typeof vi.fn>;
    loadHives: ReturnType<typeof vi.fn>;
    updateError: ReturnType<typeof vi.fn>;
    updateHive: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    hivesState = signal<{ hiveId: string; name: string; status: boolean }[]>([]);
    loadingState = signal(false);
    errorState = signal<string | null>(null);
    hasHivesState = signal(false);
    hivesStore = {
      clearCreateError: vi.fn(),
      clearUpdateError: vi.fn(),
      createError: vi.fn(() => null),
      createHive: vi.fn().mockResolvedValue(undefined),
      error: () => errorState(),
      hasHives: () => hasHivesState(),
      hives: () => hivesState(),
      isCreating: vi.fn(() => false),
      isLoading: () => loadingState(),
      isUpdating: vi.fn(() => false),
      loadHives: vi.fn().mockResolvedValue(undefined),
      updateError: vi.fn(() => null),
      updateHive: vi.fn().mockResolvedValue(undefined),
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
    expect(hivesStore.clearUpdateError).toHaveBeenCalled();
  });

  it("makes the dashboard inert while the modal is open", () => {
    // given the dashboard is interactive
    const dashboard = fixture.nativeElement.querySelector(".dashboard-shell") as HTMLElement;

    // when the Add Hive modal is opened
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    // then background dashboard content is inert
    expect(dashboard.hasAttribute("inert")).toBe(true);
  });

  it("restores focus to the Add Hive button after closing", async () => {
    // given the Add Hive button opened the modal
    const addButton = fixture.nativeElement.querySelector("[aria-label='Add Hive']") as HTMLButtonElement;
    addButton.focus();
    addButton.click();
    fixture.detectChanges();

    // when the modal is cancelled
    (fixture.nativeElement.querySelector("[aria-label='Close']") as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    // then the dashboard is interactive and focus returns to the trigger
    expect((fixture.nativeElement.querySelector(".dashboard-shell") as HTMLElement).hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(addButton);
  });

  it("restores focus to the Edit Hive button after saving", async () => {
    // given an Edit Hive button opened the modal
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();
    const editButton = fixture.nativeElement.querySelector("[aria-label='Edit Hive']") as HTMLButtonElement;
    editButton.focus();
    editButton.click();
    fixture.detectChanges();

    // when the hive is saved successfully
    const component = fixture.componentInstance as never as {
      saveHive: (payload: { name: string; status: boolean }) => Promise<void>;
    };
    await component.saveHive({ name: "North Field Updated", status: false });
    fixture.detectChanges();
    await fixture.whenStable();

    // then focus returns to the Edit Hive trigger
    expect(document.activeElement).toBe(editButton);
  });

  it("passes successful modal submission to the store", async () => {
    // given the Add Hive modal is open
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    // when valid hive details are submitted
    const component = fixture.componentInstance as never as {
      saveHive: (payload: { name: string; status: boolean }) => Promise<void>;
    };
    await component.saveHive({ name: "North Field", status: true });
    fixture.detectChanges();

    // then the store creates the hive and the modal closes
    expect(hivesStore.createHive).toHaveBeenCalledWith({ name: "North Field", status: true });
    expect(modalOpen()).toBeNull();
  });

  it("opens the Edit Hive modal from a hive card", () => {
    // given the store contains an inactive hive
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: false },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();

    // when the card edit button is clicked
    fixture.nativeElement.querySelector("[aria-label='Edit Hive']").click();
    fixture.detectChanges();

    // then update errors are cleared and the modal is prefilled for editing
    expect(modalOpen()).not.toBeNull();
    expect(hivesStore.clearCreateError).toHaveBeenCalled();
    expect(hivesStore.clearUpdateError).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain("Edit Hive");
    expect((fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement).value).toBe("North Field");
    expect((fixture.nativeElement.querySelector("#hive-status") as HTMLSelectElement).selectedOptions[0]?.textContent).toBe("Inactive");
  });

  it("passes successful edit modal submission to update, not create", async () => {
    // given the Edit Hive modal is open for a selected hive
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector("[aria-label='Edit Hive']").click();
    fixture.detectChanges();

    // when valid hive details are submitted
    const component = fixture.componentInstance as never as {
      saveHive: (payload: { name: string; status: boolean }) => Promise<void>;
    };
    await component.saveHive({ name: "North Field Updated", status: false });
    fixture.detectChanges();

    // then the store updates the selected hive and the modal closes
    expect(hivesStore.updateHive).toHaveBeenCalledWith("hive-1", {
      name: "North Field Updated",
      status: false,
    });
    expect(hivesStore.createHive).not.toHaveBeenCalled();
    expect(modalOpen()).toBeNull();
  });

  it("keeps the Edit Hive modal open when update fails", async () => {
    // given update will fail while editing a hive
    hivesStore.updateHive.mockRejectedValue({ error: { message: "Hive name already exists" } });
    hivesStore.updateError.mockReturnValue("Hive name already exists");
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector("[aria-label='Edit Hive']").click();
    fixture.detectChanges();

    // when the edit submission fails
    const component = fixture.componentInstance as never as {
      saveHive: (payload: { name: string; status: boolean }) => Promise<void>;
    };
    await component.saveHive({ name: "North Field", status: true });
    fixture.detectChanges();

    // then the modal remains open and shows the update error
    expect(modalOpen()).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain("Hive name already exists");
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

  it("reopens the Add Hive modal with default values after editing", async () => {
    // given the Edit Hive modal has been opened and saved
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: false },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector("[aria-label='Edit Hive']").click();
    fixture.detectChanges();

    const component = fixture.componentInstance as never as {
      saveHive: (payload: { name: string; status: boolean }) => Promise<void>;
    };
    await component.saveHive({ name: "North Field Updated", status: false });
    fixture.detectChanges();

    // when the Add Hive modal is opened
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    // then add mode contains its default values
    expect(fixture.nativeElement.textContent).toContain("Add Hive");
    expect((fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement).value).toBe("");
    expect((fixture.nativeElement.querySelector("#hive-status") as HTMLSelectElement).selectedOptions[0]?.textContent).toBe("Active");
  });

  it("does not submit an invalid edit form", async () => {
    // given the Edit Hive modal is open
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector("[aria-label='Edit Hive']").click();
    fixture.detectChanges();

    // when the form is submitted with a blank name
    const nameInput = fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement;
    nameInput.value = "   ";
    nameInput.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit"));
    await fixture.whenStable();
    fixture.detectChanges();

    // then no update request is made and validation feedback is visible
    expect(hivesStore.updateHive).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain("Hive name is required.");
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
