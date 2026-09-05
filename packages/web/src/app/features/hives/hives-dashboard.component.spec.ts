import { provideZonelessChangeDetection, signal, type WritableSignal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { vi } from "vitest";

import type { CreateHiveInspectionRequest } from "@appiary/types";
import { AuthStore } from "../auth/auth.store";
import { HivesDashboardComponent } from "./hives-dashboard.component";
import { HivesStore } from "./hives.store";
import { ApiariesStore } from "./apiaries.store";
import type { ApiaryViewModel } from "./apiaries.mapper";
import type { HiveViewModel } from "./hives.mapper";

describe("HivesDashboardComponent", () => {
  type TestHive = Omit<HiveViewModel, "apiaryId" | "inspections"> & Partial<Pick<HiveViewModel, "apiaryId" | "inspections">>;
  let fixture: ComponentFixture<HivesDashboardComponent>;
  let hivesState: WritableSignal<TestHive[]>;
  let loadingState: WritableSignal<boolean>;
  let errorState: WritableSignal<string | null>;
  let inspectionErrorState: WritableSignal<string | null>;
  let hasHivesState: WritableSignal<boolean>;
  let apiariesState: WritableSignal<ApiaryViewModel[]>;
  let apiariesLoadingState: WritableSignal<boolean>;
  let apiariesErrorState: WritableSignal<string | null>;
  let apiaryCreateErrorState: WritableSignal<string | null>;
  let modalOpen: () => HTMLElement | null;
  let apiariesStore: {
    apiaries: () => ApiaryViewModel[];
    clearCreateError: ReturnType<typeof vi.fn>;
    createApiary: ReturnType<typeof vi.fn>;
    createError: () => string | null;
    error: () => string | null;
    hasApiaries: () => boolean;
    isCreating: ReturnType<typeof vi.fn>;
    isLoading: () => boolean;
    loadApiaries: ReturnType<typeof vi.fn>;
    selectApiary: ReturnType<typeof vi.fn>;
    selectedApiaryId: ReturnType<typeof vi.fn>;
  };
  let hivesStore: {
    clearCreateError: ReturnType<typeof vi.fn>;
    clearUpdateError: ReturnType<typeof vi.fn>;
    clearInspectionError: ReturnType<typeof vi.fn>;
    createError: ReturnType<typeof vi.fn>;
    createHive: ReturnType<typeof vi.fn>;
    error: () => string | null;
    hasHives: () => boolean;
    hives: () => HiveViewModel[];
    isCreating: ReturnType<typeof vi.fn>;
    isLoading: () => boolean;
    isUpdating: ReturnType<typeof vi.fn>;
    isSavingInspection: ReturnType<typeof vi.fn>;
    inspectionError: ReturnType<typeof vi.fn>;
    inspectionPaginationFailure: ReturnType<typeof vi.fn>;
    isLoadingInspectionPage: ReturnType<typeof vi.fn>;
    loadInspectionPage: ReturnType<typeof vi.fn>;
    loadHives: ReturnType<typeof vi.fn>;
    retryInspectionPage: ReturnType<typeof vi.fn>;
    updateError: ReturnType<typeof vi.fn>;
    updateHive: ReturnType<typeof vi.fn>;
    createInspection: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    hivesState = signal<TestHive[]>([]);
    loadingState = signal(false);
    errorState = signal<string | null>(null);
    inspectionErrorState = signal<string | null>(null);
    hasHivesState = signal(false);
    apiariesState = signal([{ apiaryId: "apiary-1", name: "Home Apiary", status: true }]);
    apiariesLoadingState = signal(false);
    apiariesErrorState = signal<string | null>(null);
    apiaryCreateErrorState = signal<string | null>(null);
    hivesStore = {
      clearCreateError: vi.fn(),
      clearUpdateError: vi.fn(),
      clearInspectionError: vi.fn(() => inspectionErrorState.set(null)),
      createError: vi.fn(() => null),
      createHive: vi.fn().mockResolvedValue(undefined),
      error: () => errorState(),
      hasHives: () => hasHivesState(),
      hives: () => hivesState() as HiveViewModel[],
      isCreating: vi.fn(() => false),
      isLoading: () => loadingState(),
      isUpdating: vi.fn(() => false),
      isSavingInspection: vi.fn(() => false),
      inspectionError: vi.fn(() => inspectionErrorState()),
      inspectionPaginationFailure: vi.fn(() => null),
      isLoadingInspectionPage: vi.fn(() => false),
      loadInspectionPage: vi.fn().mockResolvedValue(undefined),
      loadHives: vi.fn().mockResolvedValue(undefined),
      retryInspectionPage: vi.fn().mockResolvedValue(undefined),
      updateError: vi.fn(() => null),
      updateHive: vi.fn().mockResolvedValue(undefined),
      createInspection: vi.fn().mockResolvedValue(undefined),
    };
    apiariesStore = {
      apiaries: () => apiariesState(),
      clearCreateError: vi.fn(() => apiaryCreateErrorState.set(null)),
      createApiary: vi.fn().mockResolvedValue(undefined),
      createError: () => apiaryCreateErrorState(),
      error: () => apiariesErrorState(),
      hasApiaries: () => apiariesState().length > 0,
      isCreating: vi.fn(() => false),
      isLoading: () => apiariesLoadingState(),
      loadApiaries: vi.fn().mockResolvedValue(undefined),
      selectApiary: vi.fn().mockResolvedValue(undefined),
      selectedApiaryId: vi.fn(() => "apiary-1"),
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
        { provide: ApiariesStore, useValue: apiariesStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HivesDashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it("loads apiaries on render", () => {
    // given the dashboard fixture is created
    // when the initial dashboard view renders
    // then the apiary store starts dashboard initialization
    expect(apiariesStore.loadApiaries).toHaveBeenCalled();
  });

  it("displays loading state", () => {
    // given the hives store reports that loading is active
    loadingState.set(true);

    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then the loading message and controls remain visible with filtering disabled
    expect(fixture.nativeElement.textContent).toContain("Loading hives...");
    expect(fixture.nativeElement.querySelector("[aria-label='Add Hive']")).not.toBeNull();
    expect((fixture.nativeElement.querySelector("#hive-status-filter") as HTMLSelectElement).disabled).toBe(true);
  });

  it("displays empty state", () => {
    // given the hives store contains no hives
    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then the empty-state message is visible
    expect(fixture.nativeElement.textContent).toContain("No hives yet");
  });

  it("groups the hive controls above the hive displays", () => {
    // given the dashboard is showing its empty hive display
    const controls = fixture.nativeElement.querySelector("[aria-label='Hive controls']") as HTMLElement;
    const emptyState = fixture.nativeElement.querySelector(".empty-state") as HTMLElement;

    // when the controls card is inspected
    const filter = controls.querySelector("#hive-status-filter");
    const addButton = controls.querySelector("[aria-label='Add Hive']") as HTMLButtonElement;
    const icon = addButton.querySelector(".add-hive-icon");

    // then both controls are grouped before the hive display and the add action has visible text
    expect(controls.classList.contains("card")).toBe(true);
    expect(filter).not.toBeNull();
    expect(controls.querySelector("#apiary-filter")).not.toBeNull();
    expect(controls.querySelector("[aria-label='Add Apiary']")).not.toBeNull();
    expect(addButton.textContent).toContain("Add Hive");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(controls.compareDocumentPosition(emptyState) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it("reloads scoped hives when the apiary selection changes", () => {
    // given two apiaries are available in the controls card
    apiariesState.set([
      { apiaryId: "apiary-1", name: "Home Apiary", status: true },
      { apiaryId: "apiary-2", name: "Orchard", status: false },
    ]);
    fixture.detectChanges();

    // when the second apiary is selected
    const select = fixture.nativeElement.querySelector("#apiary-filter") as HTMLSelectElement;
    select.value = "apiary-2";
    select.dispatchEvent(new Event("change"));

    // then selection delegates to the apiary store and inactive status is visible
    expect(apiariesStore.selectApiary).toHaveBeenCalledWith("apiary-2");
    expect(select.options[1]?.textContent).toContain("Orchard (Inactive)");
  });

  it("shows apiary failure separately from hive failure", () => {
    // given loading the apiary list failed while a previous hive error also exists
    apiariesErrorState.set("Apiaries unavailable");
    errorState.set("Hives unavailable");

    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then only the actionable apiary-list failure is presented
    expect(fixture.nativeElement.textContent).toContain("Unable to load apiaries: Apiaries unavailable");
    expect(fixture.nativeElement.textContent).not.toContain("Hives unavailable");
  });

  it("offers scoped retries for apiary-list and hive-list failures", () => {
    // given the apiary list has failed
    apiariesErrorState.set("Apiaries unavailable");
    fixture.detectChanges();

    // when its retry action is used
    (fixture.nativeElement.querySelector("[aria-label='Retry Apiaries']") as HTMLButtonElement).click();

    // then the apiary list is requested again
    expect(apiariesStore.loadApiaries).toHaveBeenCalledTimes(2);

    // given the apiary list recovers but the selected apiary's hives fail
    apiariesErrorState.set(null);
    errorState.set("Hives unavailable");
    fixture.detectChanges();

    // when its retry action is used
    (fixture.nativeElement.querySelector("[aria-label='Retry Hives']") as HTMLButtonElement).click();

    // then only the selected apiary's hives are requested again
    expect(hivesStore.loadHives).toHaveBeenCalledWith("apiary-1");
  });

  it("prompts for an apiary and disables Add Hive when none exist", () => {
    // given the account has no apiaries
    apiariesState.set([]);

    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then the empty-apiary guidance is shown and adding a hive is unavailable
    expect(fixture.nativeElement.textContent).toContain("No apiaries yet");
    expect(fixture.nativeElement.textContent).toContain("Create your first apiary before adding hives.");
    expect((fixture.nativeElement.querySelector("[aria-label='Add Hive']") as HTMLButtonElement).disabled).toBe(true);
  });

  it("creates an apiary from a modal and restores focus to its trigger", async () => {
    // given the Add Apiary button opened the modal
    const addApiaryButton = fixture.nativeElement.querySelector("[aria-label='Add Apiary']") as HTMLButtonElement;
    addApiaryButton.focus();
    addApiaryButton.click();
    fixture.detectChanges();

    // when a valid apiary is saved
    const component = fixture.componentInstance as never as {
      saveApiary: (payload: { name: string }) => Promise<void>;
    };
    await component.saveApiary({ name: "Orchard" });
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // then the apiary store receives it, the modal closes, and focus returns to the trigger
    expect(apiariesStore.clearCreateError).toHaveBeenCalled();
    expect(apiariesStore.createApiary).toHaveBeenCalledWith({ name: "Orchard" });
    expect(modalOpen()).toBeNull();
    expect(document.activeElement).toBe(addApiaryButton);
  });

  it("keeps the Add Apiary modal and form open after an API failure", async () => {
    // given an open modal contains a name and apiary creation will fail
    apiariesStore.createApiary.mockImplementationOnce(async () => {
      apiaryCreateErrorState.set("Apiary name already exists");
      throw new Error("failed");
    });
    fixture.nativeElement.querySelector("[aria-label='Add Apiary']").click();
    fixture.detectChanges();
    const nameInput = fixture.nativeElement.querySelector("#apiary-name") as HTMLInputElement;
    nameInput.value = "Orchard";
    nameInput.dispatchEvent(new Event("input"));

    // when saving fails
    const component = fixture.componentInstance as never as {
      saveApiary: (payload: { name: string }) => Promise<void>;
    };
    await component.saveApiary({ name: "Orchard" });
    fixture.detectChanges();

    // then the modal remains open with the entered value and create-specific error
    expect(modalOpen()).not.toBeNull();
    expect((fixture.nativeElement.querySelector("#apiary-name") as HTMLInputElement).value).toBe("Orchard");
    expect(fixture.nativeElement.textContent).toContain("Apiary name already exists");
  });

  it("shows only active hives by default", () => {
    // given the store contains an active and an inactive hive
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
      { hiveId: "hive-2", name: "South Field", status: false },
    ]);
    hasHivesState.set(true);

    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then Active is selected and only the active card is visible
    expect((fixture.nativeElement.querySelector("#hive-status-filter") as HTMLSelectElement).value).toBe("active");
    expect(fixture.nativeElement.querySelector("[data-testid='hive-card-hive-1']")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("[data-testid='hive-card-hive-2']")).toBeNull();
  });

  it("shows all hives when All is selected", () => {
    // given the store contains an active and an inactive hive
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
      { hiveId: "hive-2", name: "South Field", status: false },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();

    // when All is selected
    const filter = fixture.nativeElement.querySelector("#hive-status-filter") as HTMLSelectElement;
    filter.value = "all";
    filter.dispatchEvent(new Event("change"));
    fixture.detectChanges();

    // then both cards are visible
    expect(fixture.nativeElement.querySelector("[data-testid='hive-card-hive-1']")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("[data-testid='hive-card-hive-2']")).not.toBeNull();
  });

  it("binds pagination state and retry to only the affected hive card", () => {
    // given two active hives have independent pagination state
    const inspection = { inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-30", inspectionTime: "09:15", queenRight: true, eggs: true, larva: true, cappedBrood: true, broodPattern: null, additionalNotes: null };
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true, inspections: [inspection], inspectionPagination: { page: 1, pageSize: 5, totalItems: 6, totalPages: 2 } },
      { hiveId: "hive-2", name: "South Field", status: true, inspections: [{ ...inspection, inspectionId: "inspection-2", hiveId: "hive-2" }], inspectionPagination: { page: 1, pageSize: 5, totalItems: 6, totalPages: 2 } },
    ]);
    hasHivesState.set(true);
    hivesStore.isLoadingInspectionPage.mockImplementation((hiveId: string) => hiveId === "hive-2");
    hivesStore.inspectionPaginationFailure.mockImplementation((hiveId: string) => hiveId === "hive-1"
      ? { message: "Could not load North inspections", page: 2 }
      : null);

    // when the dashboard renders and the affected card requests a retry
    fixture.detectChanges();
    const firstCard = fixture.nativeElement.querySelector("[data-testid='hive-card-hive-1']") as HTMLElement;
    const secondCard = fixture.nativeElement.querySelector("[data-testid='hive-card-hive-2']") as HTMLElement;
    (firstCard.querySelector("button[aria-label='Retry inspections for hive card 1']") as HTMLButtonElement).click();

    // then error and loading stay on their own cards and retry delegates its own hive ID
    expect(firstCard.querySelector("[role='alert']")?.textContent).toContain("Could not load North inspections");
    expect(secondCard.querySelector("[role='alert']")).toBeNull();
    expect((firstCard.querySelector("button[aria-label='Next inspections for hive card 1']") as HTMLButtonElement).disabled).toBe(false);
    expect((secondCard.querySelector("button[aria-label='Next inspections for hive card 2']") as HTMLButtonElement).disabled).toBe(true);
    expect(hivesStore.retryInspectionPage).toHaveBeenCalledOnce();
    expect(hivesStore.retryInspectionPage).toHaveBeenCalledWith("hive-1");
  });

  it("shows only inactive hives when Inactive is selected", () => {
    // given the store contains an active and an inactive hive
    hivesState.set([
      { hiveId: "hive-1", name: "North Field", status: true },
      { hiveId: "hive-2", name: "South Field", status: false },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();

    // when Inactive is selected
    const filter = fixture.nativeElement.querySelector("#hive-status-filter") as HTMLSelectElement;
    filter.value = "inactive";
    filter.dispatchEvent(new Event("change"));
    fixture.detectChanges();

    // then only the inactive card is visible
    expect(fixture.nativeElement.querySelector("[data-testid='hive-card-hive-1']")).toBeNull();
    expect(fixture.nativeElement.querySelector("[data-testid='hive-card-hive-2']")).not.toBeNull();
  });

  it("distinguishes filtered results from an empty apiary", () => {
    // given the store contains only an inactive hive under the default Active filter
    hivesState.set([{ hiveId: "hive-1", name: "North Field", status: false }]);
    hasHivesState.set(true);

    // when the dashboard view is refreshed
    fixture.detectChanges();

    // then a filter-specific empty state is shown instead of the account empty state
    expect(fixture.nativeElement.textContent).toContain("No active hives");
    expect(fixture.nativeElement.textContent).not.toContain("No hives yet");
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
    await new Promise((resolve) => setTimeout(resolve, 0));

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
    const editButton = fixture.nativeElement.querySelector("[aria-label='Edit Hive for hive card 1']") as HTMLButtonElement;
    editButton.focus();
    editButton.click();
    fixture.detectChanges();

    // when the hive is saved successfully
    const component = fixture.componentInstance as never as {
      saveHive: (payload: { apiaryId: string; name: string; status: boolean }) => Promise<void>;
    };
    await component.saveHive({ apiaryId: "apiary-1", name: "North Field Updated", status: false });
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // then focus returns to the Edit Hive trigger
    expect(document.activeElement).toBe(editButton);
  });

  it("passes successful modal submission to the store", async () => {
    // given the Add Hive modal is open
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    // when valid hive details are submitted
    const component = fixture.componentInstance as never as {
      saveHive: (payload: { apiaryId: string; name: string; status: boolean }) => Promise<void>;
    };
    await component.saveHive({ apiaryId: "apiary-1", name: "North Field", status: true });
    fixture.detectChanges();

    // then the store creates the hive and the modal closes
    expect(hivesStore.createHive).toHaveBeenCalledWith({ apiaryId: "apiary-1", name: "North Field", status: true });
    expect(modalOpen()).toBeNull();
  });

  it("opens the Edit Hive modal from a hive card", () => {
    // given the store contains an inactive hive
    apiariesState.set([
      { apiaryId: "apiary-1", name: "Home Apiary", status: true },
      { apiaryId: "apiary-2", name: "Orchard", status: false },
    ]);
    hivesState.set([
      { hiveId: "hive-1", apiaryId: "apiary-2", name: "North Field", status: false },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();
    const filter = fixture.nativeElement.querySelector("#hive-status-filter") as HTMLSelectElement;
    filter.value = "inactive";
    filter.dispatchEvent(new Event("change"));
    fixture.detectChanges();

    // when the card edit button is clicked
    fixture.nativeElement.querySelector("[aria-label='Edit Hive for hive card 1']").click();
    fixture.detectChanges();

    // then update errors are cleared and the modal is prefilled for editing
    expect(modalOpen()).not.toBeNull();
    expect(hivesStore.clearCreateError).toHaveBeenCalled();
    expect(hivesStore.clearUpdateError).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain("Edit Hive");
    expect((fixture.nativeElement.querySelector("#hive-apiary") as HTMLSelectElement).value).toBe("apiary-2");
    expect(fixture.nativeElement.textContent).toContain("Orchard (Inactive)");
    expect((fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement).value).toBe("North Field");
    expect((fixture.nativeElement.querySelector("#hive-status") as HTMLSelectElement).selectedOptions[0]?.textContent).toBe("Inactive");
  });

  it("passes successful edit modal submission to update, not create", async () => {
    // given the Edit Hive modal is open for a selected hive
    apiariesState.set([
      { apiaryId: "apiary-1", name: "Home Apiary", status: true },
      { apiaryId: "apiary-2", name: "Orchard", status: true },
    ]);
    hivesState.set([
      { hiveId: "hive-1", apiaryId: "apiary-1", name: "North Field", status: true },
    ]);
    hasHivesState.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector("[aria-label='Edit Hive for hive card 1']").click();
    fixture.detectChanges();

    // when valid hive details are submitted
    const component = fixture.componentInstance as never as {
      saveHive: (payload: { apiaryId: string; name: string; status: boolean }) => Promise<void>;
    };
    await component.saveHive({ apiaryId: "apiary-2", name: "North Field Updated", status: false });
    fixture.detectChanges();

    // then the store updates the selected hive and the modal closes
    expect(hivesStore.updateHive).toHaveBeenCalledWith("hive-1", {
      apiaryId: "apiary-2",
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
    fixture.nativeElement.querySelector("[aria-label='Edit Hive for hive card 1']").click();
    fixture.detectChanges();

    // when the edit submission fails
    const component = fixture.componentInstance as never as {
      saveHive: (payload: { apiaryId: string; name: string; status: boolean }) => Promise<void>;
    };
    await component.saveHive({ apiaryId: "apiary-1", name: "North Field", status: true });
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
    const filter = fixture.nativeElement.querySelector("#hive-status-filter") as HTMLSelectElement;
    filter.value = "inactive";
    filter.dispatchEvent(new Event("change"));
    fixture.detectChanges();
    fixture.nativeElement.querySelector("[aria-label='Edit Hive for hive card 1']").click();
    fixture.detectChanges();

    const component = fixture.componentInstance as never as {
      saveHive: (payload: { apiaryId: string; name: string; status: boolean }) => Promise<void>;
    };
    await component.saveHive({ apiaryId: "apiary-1", name: "North Field Updated", status: false });
    fixture.detectChanges();

    // when the Add Hive modal is opened
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    // then add mode contains its default values
    expect(fixture.nativeElement.textContent).toContain("Add Hive");
    expect((fixture.nativeElement.querySelector("#hive-apiary") as HTMLSelectElement).value).toBe("apiary-1");
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
    fixture.nativeElement.querySelector("[aria-label='Edit Hive for hive card 1']").click();
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

  it("clears a failed create error before opening a historical inspection", () => {
    // given a hive has history while a stale inspection error is stored
    const inspection = { inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-30", inspectionTime: "09:15", queenRight: true, eggs: false, larva: true, cappedBrood: true, broodPattern: "fair" as const, additionalNotes: null };
    hivesState.set([{ hiveId: "hive-1", name: "North Field", status: true, inspections: [inspection] }]);
    hasHivesState.set(true);
    inspectionErrorState.set("Could not save inspection");
    fixture.detectChanges();

    // when the historical inspection is opened
    (fixture.nativeElement.querySelector("tbody tr") as HTMLTableRowElement).click();
    fixture.detectChanges();

    // then the stale create error is cleared from the history modal
    expect(hivesStore.clearInspectionError).toHaveBeenLastCalledWith();
    expect(fixture.nativeElement.textContent).not.toContain("Could not save inspection");
  });

  it("opens Add Inspection for the selected hive and closes other modal state", () => {
    // given a hive card is rendered after Add Hive has been opened
    const hive = { hiveId: "hive-1", name: "North Field", status: true, inspections: [] };
    hivesState.set([hive]);
    hasHivesState.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector("[aria-label='Add Hive']").click();
    fixture.detectChanges();

    // when inspection creation is opened for that hive
    const component = fixture.componentInstance as never as { openAddInspectionModal: (value: typeof hive) => void };
    component.openAddInspectionModal(hive);
    fixture.detectChanges();

    // then exactly one create-inspection dialog is shown
    expect(fixture.nativeElement.querySelectorAll("[role='dialog']")).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain("Hive Inspection");
    expect(fixture.nativeElement.querySelector("button[type='submit']")).not.toBeNull();
    expect(hivesStore.clearInspectionError).toHaveBeenCalled();
  });

  it("opens historical inspections in read-only mode", () => {
    // given a hive contains an inspection
    const inspection = { inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-30", inspectionTime: "09:15", queenRight: true, eggs: false, larva: true, cappedBrood: true, broodPattern: "fair" as const, additionalNotes: null };
    hivesState.set([{ hiveId: "hive-1", name: "North Field", status: true, inspections: [inspection] }]);
    hasHivesState.set(true);
    fixture.detectChanges();

    // when its history row is clicked
    fixture.nativeElement.querySelector("tbody tr").click();
    fixture.detectChanges();

    // then values are disabled and no save action is present
    expect((fixture.nativeElement.querySelector("#inspection-date") as HTMLInputElement).disabled).toBe(true);
    expect(fixture.nativeElement.querySelector("button[type='submit']")).toBeNull();
  });

  it("saves an inspection through the store and closes the modal", async () => {
    // given Add Inspection is open for a hive
    hivesState.set([{ hiveId: "hive-1", name: "North Field", status: true, inspections: [] }]);
    hasHivesState.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector("[aria-label='Add Inspection for hive card 1']").click();
    fixture.detectChanges();
    const payload = { inspectionDate: "2026-07-31", inspectionTime: "10:30", queenRight: true, eggs: true, larva: false, cappedBrood: true };

    // when valid inspection details are saved
    const component = fixture.componentInstance as never as { saveInspection: (value: typeof payload) => Promise<void> };
    await component.saveInspection(payload);
    fixture.detectChanges();

    // then the selected hive is targeted and the modal closes
    expect(hivesStore.createInspection).toHaveBeenCalledWith("hive-1", payload);
    expect(modalOpen()).toBeNull();
  });

  it("keeps Add Inspection open when saving fails", async () => {
    // given Add Inspection is open and the store will reject the save
    hivesStore.createInspection.mockRejectedValue(new Error("failed"));
    inspectionErrorState.set("Could not save inspection");
    hivesState.set([{ hiveId: "hive-1", name: "North Field", status: true, inspections: [] }]);
    hasHivesState.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector("[aria-label='Add Inspection for hive card 1']").click();
    fixture.detectChanges();

    // when inspection saving fails
    const payload: CreateHiveInspectionRequest = {
      inspectionDate: "2026-07-31", inspectionTime: "10:30", queenRight: true,
      eggs: true, larva: false, cappedBrood: true, broodPattern: null, additionalNotes: null,
    };
    const component = fixture.componentInstance as never as { saveInspection: (value: CreateHiveInspectionRequest) => Promise<void> };
    await component.saveInspection(payload);
    inspectionErrorState.set("Could not save inspection");
    fixture.detectChanges();

    // then the inspection modal remains open with its error
    expect(modalOpen()).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain("Could not save inspection");
  });
});

