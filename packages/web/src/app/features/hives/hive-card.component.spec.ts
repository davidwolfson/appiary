import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { HiveCardComponent } from "./hive-card.component";

describe("HiveCardComponent", () => {
  let fixture: ComponentFixture<HiveCardComponent>;

  const createInspections = (count: number, hiveId = "hive-1") => Array.from({ length: count }, (_, index) => ({
    inspectionId: `${hiveId}-inspection-${index}`,
    hiveId,
    inspectionDate: `2026-07-${String(30 - index).padStart(2, "0")}`,
    inspectionTime: "09:15",
    queenRight: true,
    eggs: true,
    larva: true,
    cappedBrood: true,
    broodPattern: null,
    additionalNotes: null,
  }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HiveCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(HiveCardComponent);
    fixture.componentRef.setInput("cardIndex", 0);
  });

  it("renders an active icon beside the Hive title", () => {
    // given an active hive is supplied to the card
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
    });

    // when the card view is rendered
    fixture.detectChanges();

    // then the hive name and green checkmark icon with an Active tooltip are visible
    const title = fixture.nativeElement.querySelector(".brand-mark") as HTMLElement;
    const statusIcon = fixture.nativeElement.querySelector("[role='img'][aria-label='Active']") as HTMLElement;
    expect(fixture.nativeElement.textContent).toContain("North Field");
    expect(statusIcon.previousElementSibling).toBe(title);
    expect(statusIcon.textContent?.trim()).toBe("✓");
    expect(statusIcon.classList).toContain("bg-success");
    expect(statusIcon.title).toBe("Active");
    expect(fixture.nativeElement.querySelector(".badge")).toBeNull();
  });

  it("renders an inactive icon beside the Hive title", () => {
    // given an inactive hive is supplied to the card
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: false,
    });

    // when the card view is rendered
    fixture.detectChanges();

    // then a gray minus icon with an Inactive tooltip is beside the title
    const title = fixture.nativeElement.querySelector(".brand-mark") as HTMLElement;
    const statusIcon = fixture.nativeElement.querySelector("[role='img'][aria-label='Inactive']") as HTMLElement;
    expect(statusIcon.previousElementSibling).toBe(title);
    expect(statusIcon.textContent?.trim()).toBe("−");
    expect(statusIcon.classList).toContain("text-secondary");
    expect(statusIcon.title).toBe("Inactive");
    expect(fixture.nativeElement.querySelector(".badge")).toBeNull();
  });

  it("renders a text-labeled edit button without a tooltip", () => {
    // given a hive is supplied to the card
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
    });

    // when the card view is rendered
    fixture.detectChanges();

    // then the edit affordance is exposed with its accessible label and visible text
    const editButton = fixture.nativeElement.querySelector("button[aria-label='Edit Hive for hive card 1']") as HTMLButtonElement;
    const card = fixture.nativeElement.querySelector("article") as HTMLElement;
    expect(editButton).not.toBeNull();
    expect(editButton.textContent).toContain("Edit Hive");
    expect(editButton.title).toBe("");
    expect(card.dataset["testid"]).toBe("hive-card-hive-1");
  });

  it("keeps card actions in responsive normal flow below the hive heading", () => {
    // given a hive with a long name is supplied to a narrow card layout
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field Observation Colony",
      status: true,
    });

    // when the card header is rendered
    fixture.detectChanges();

    // then the heading and wrapping action row occupy separate normal-flow regions
    const card = fixture.nativeElement.querySelector("article") as HTMLElement;
    const header = fixture.nativeElement.querySelector("header") as HTMLElement;
    const heading = header.querySelector("h2") as HTMLHeadingElement;
    const actions = header.querySelector(".hive-card-actions") as HTMLElement;
    expect(card.classList).not.toContain("position-relative");
    expect(actions.classList).toContain("flex-wrap");
    expect(actions.classList).not.toContain("position-absolute");
    expect(heading.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(actions.querySelectorAll("button")).toHaveLength(2);
  });

  it("uses the one-based card index to distinguish control names", () => {
    // given the hive is rendered as the third card
    fixture.componentRef.setInput("cardIndex", 2);
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-3",
      name: "North Field",
      status: true,
      inspections: createInspections(6, "hive-3"),
    });

    // when the card view is rendered
    fixture.detectChanges();

    // then every card-level control identifies the card it operates on
    expect(fixture.nativeElement.querySelector("[aria-label='Add Inspection for hive card 3']")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("[aria-label='Edit Hive for hive card 3']")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("[aria-label='Previous inspections for hive card 3']")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("[aria-label='Next inspections for hive card 3']")).not.toBeNull();
  });

  it("emits the selected hive when edit is clicked", () => {
    // given a hive is supplied to the card
    const hive = {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
    };
    const emitted: unknown[] = [];
    fixture.componentRef.setInput("hive", hive);
    fixture.componentInstance.edit.subscribe((selectedHive) => emitted.push(selectedHive));

    // when the edit button is clicked
    fixture.detectChanges();
    fixture.nativeElement.querySelector("button[aria-label='Edit Hive for hive card 1']").click();

    // then the card emits that hive
    expect(emitted).toEqual([hive]);
  });

  it("emits the hive from Add Inspection", () => {
    // given a hive card listens for inspection creation
    const hive = { hiveId: "hive-1", name: "North Field", status: true, inspections: [] };
    const emitted: unknown[] = [];
    fixture.componentRef.setInput("hive", hive);
    fixture.componentInstance.addInspection.subscribe((value) => emitted.push(value));
    fixture.detectChanges();

    // when Add Inspection is clicked
    fixture.nativeElement.querySelector("[aria-label='Add Inspection for hive card 1']").click();

    // then the card emits its hive
    expect(emitted).toEqual([hive]);
  });

  it("displays an empty message when there are no inspections", () => {
    // given a hive has empty inspection history
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: [] });

    // when the card renders
    fixture.detectChanges();

    // then no history table is displayed and the empty message is visible
    expect(fixture.nativeElement.querySelector("table")).toBeNull();
    const emptyState = fixture.nativeElement.querySelector(".empty-state") as HTMLElement;
    expect(emptyState.textContent).toContain("No inspections to display yet.");
    expect(emptyState.classList).toContain("text-center");
  });

  it("hides the empty message while inspections are loading", () => {
    // given a hive has no loaded inspections and its history is loading
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: [] });
    fixture.componentRef.setInput("loadingInspections", true);

    // when the card renders
    fixture.detectChanges();

    // then no empty message is displayed before loading completes
    expect(fixture.nativeElement.querySelector(".empty-state")).toBeNull();
  });

  it("renders the revised inspection table with calendar dates", () => {
    // given a hive has valid and malformed inspection dates
    const inspections = createInspections(2);
    inspections[1].inspectionDate = "not-a-date";
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections });

    // when the card renders its inspection table
    fixture.detectChanges();

    // then the title, headers, plain formatted date, and malformed fallback are visible
    const table = fixture.nativeElement.querySelector("table") as HTMLTableElement;
    const headers = Array.from(table.querySelectorAll("th"), (header) => header.textContent?.trim());
    const dateCell = table.querySelector("tbody tr:first-child td:first-child") as HTMLTableCellElement;
    expect(table.caption?.textContent?.trim()).toBe("Inspections");
    expect(headers).toEqual(["Date", "Summary", "Notes"]);
    expect(dateCell.textContent?.trim()).toBe("7/30/2026");
    expect(dateCell.querySelector("button, a")).toBeNull();
    expect(table.querySelector("tbody tr:nth-child(2) td:first-child")?.textContent?.trim()).toBe("not-a-date");
  });

  it("renders ordered summaries and result tooltips for every brood-pattern mapping", () => {
    // given inspections contain full, partial, omitted, and mapped findings
    const inspections = [
      { ...createInspections(1)[0], inspectionId: "full", broodPattern: "good" as const },
      { ...createInspections(1)[0], inspectionId: "partial", queenRight: false, eggs: true, larva: false, cappedBrood: true, broodPattern: "fair" as const },
      { ...createInspections(1)[0], inspectionId: "poor", queenRight: false, eggs: false, larva: false, cappedBrood: false, broodPattern: "poor" as const },
      { ...createInspections(1)[0], inspectionId: "na", queenRight: false, eggs: false, larva: false, cappedBrood: false, broodPattern: "na" as const },
      { ...createInspections(1)[0], inspectionId: "null", queenRight: false, eggs: false, larva: false, cappedBrood: false, broodPattern: null },
    ];
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections });

    // when the summary cells render
    fixture.detectChanges();

    // then compact tokens and verbose labels use matching order without placeholders
    const summaryCells = Array.from(fixture.nativeElement.querySelectorAll("tbody td:nth-child(2)")) as HTMLTableCellElement[];
    const summaries = summaryCells.map((cell) => cell.textContent?.trim());
    expect(summaries).toEqual(["QRELCB3", "ECB2", "1", "", ""]);
    expect(summaryCells.map((cell) => cell.getAttribute("title"))).toEqual([
      "queen-right, eggs, larvae, capped brood, good pattern",
      "eggs, capped brood, fair pattern",
      "poor pattern",
      null,
      null,
    ]);
  });

  it("shows trimmed note icons only for meaningful notes", () => {
    // given inspections have populated, null, empty, and whitespace notes
    const inspections = ["  Healthy colony  ", null, "", "   "].map((additionalNotes, index) => ({
      ...createInspections(1)[0],
      inspectionId: `inspection-${index}`,
      additionalNotes,
    }));
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections });

    // when the notes cells render
    fixture.detectChanges();

    // then only the populated note produces an accessible icon and trimmed tooltip
    const summaryCells = fixture.nativeElement.querySelectorAll("tbody td:nth-child(2)") as NodeListOf<HTMLTableCellElement>;
    const notesCells = fixture.nativeElement.querySelectorAll("tbody td:nth-child(3)") as NodeListOf<HTMLTableCellElement>;
    const noteIcon = notesCells[0].querySelector("[role='img']") as HTMLElement;
    expect(summaryCells[0].getAttribute("title")).toBe("queen-right, eggs, larvae, capped brood");
    expect(noteIcon.getAttribute("title")).toBe("Healthy colony");
    expect(noteIcon.getAttribute("aria-label")).toBe("Additional notes: Healthy colony");
    expect(noteIcon.querySelector("button, a")).toBeNull();
    expect(Array.from(notesCells, (cell) => cell.querySelectorAll("[role='img'], [title]").length)).toEqual([1, 0, 0, 0]);
  });

  it("opens and focuses an inspection from every row cell and the notes icon", () => {
    // given a row is listening for inspection activation
    const inspection = { ...createInspections(1)[0], additionalNotes: "Healthy colony" };
    const emitted: unknown[] = [];
    const focusedAtEmission: Element[] = [];
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: [inspection] });
    fixture.componentInstance.viewInspection.subscribe((value) => {
      emitted.push(value);
      focusedAtEmission.push(document.activeElement!);
    });
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector("tbody tr") as HTMLTableRowElement;
    const cells = row.querySelectorAll("td");

    // when each cell and the nested notes icon are clicked
    (cells[0] as HTMLElement).click();
    (cells[1] as HTMLElement).click();
    (cells[2] as HTMLElement).click();
    (cells[2].querySelector("[role='img']") as HTMLElement).click();

    // then each activation emits once with the row focused first
    expect(emitted).toEqual([inspection, inspection, inspection, inspection]);
    expect(focusedAtEmission).toEqual([row, row, row, row]);
  });

  it("opens inspections with Enter and Space without scrolling", () => {
    // given a focusable inspection row is listening for keyboard activation
    const inspection = createInspections(1)[0];
    const emitted: unknown[] = [];
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: [inspection] });
    fixture.componentInstance.viewInspection.subscribe((value) => emitted.push(value));
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector("tbody tr") as HTMLTableRowElement;
    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    const space = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });

    // when Enter and Space activate the row
    row.dispatchEvent(enter);
    row.dispatchEvent(space);

    // then both emit exactly once, focus the row, and Space prevents scrolling
    expect(emitted).toEqual([inspection, inspection]);
    expect(document.activeElement).toBe(row);
    expect(space.defaultPrevented).toBe(true);
  });

  it("supports legacy client-side pagination in groups of five", () => {
    // given a hive has six inspections
    const inspections = createInspections(6);
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections });

    // when the card renders
    fixture.detectChanges();

    // then the newest five and correctly labelled boundary controls are shown
    const previous = fixture.nativeElement.querySelector("button[aria-label='Previous inspections for hive card 1']") as HTMLButtonElement;
    const next = fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']") as HTMLButtonElement;
    expect(fixture.nativeElement.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(fixture.nativeElement.textContent).not.toContain("7/25/2026");
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    // when the next page is requested
    next.click();
    fixture.detectChanges();

    // then the final partial page is shown at its boundary
    expect(fixture.nativeElement.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain("7/25/2026");
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(true);
  });

  it("omits legacy pagination for histories of five or fewer inspections", () => {
    // given a hive has exactly one full page of inspections
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: createInspections(5) });

    // when the card renders
    fixture.detectChanges();

    // then no pagination controls are displayed
    expect(fixture.nativeElement.querySelector("button[aria-label='Previous inspections for hive card 1']")).toBeNull();
    expect(fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']")).toBeNull();
  });

  it("supports legacy middle pages and bounded previous navigation", () => {
    // given a hive has three pages of inspections
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: createInspections(11) });
    fixture.detectChanges();
    const previous = fixture.nativeElement.querySelector("button[aria-label='Previous inspections for hive card 1']") as HTMLButtonElement;
    const next = fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']") as HTMLButtonElement;

    // when navigating to the middle page and back beyond the first boundary
    next.click();
    fixture.detectChanges();
    const middleState = { previousDisabled: previous.disabled, nextDisabled: next.disabled };
    previous.click();
    previous.click();
    fixture.detectChanges();

    // then both directions were available in the middle and navigation stops on page one
    expect(middleState).toEqual({ previousDisabled: false, nextDisabled: false });
    expect(previous.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain("7/30/2026");
  });

  it("resets legacy pagination when inspection input is replaced", () => {
    // given a card is displaying an older page
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: createInspections(6) });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']") as HTMLButtonElement).click();
    fixture.detectChanges();

    // when its hive input is replaced with a shorter history
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: createInspections(2) });
    fixture.detectChanges();

    // then the card safely returns to the first page
    expect(fixture.nativeElement.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain("7/30/2026");
  });

  it("opens an inspection from a later legacy page", () => {
    // given a hive has an inspection on a second page
    const inspections = createInspections(6);
    const emitted: unknown[] = [];
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections });
    fixture.componentInstance.viewInspection.subscribe((value) => emitted.push(value));
    fixture.detectChanges();

    // when the later inspection is opened
    (fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']") as HTMLButtonElement).click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector("tbody tr").click();

    // then that inspection is emitted
    expect(emitted).toEqual([inspections[5]]);
  });

  it("emits server page requests without slicing the supplied inspection page", () => {
    // given a server-provided middle page contains one inspection
    const inspections = createInspections(1);
    const emitted: number[] = [];
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
      inspections,
      inspectionPagination: { page: 2, pageSize: 5, totalItems: 11, totalPages: 3 },
    });
    fixture.componentInstance.inspectionPageRequested.subscribe((page) => emitted.push(page));
    fixture.detectChanges();
    const previous = fixture.nativeElement.querySelector("button[aria-label='Previous inspections for hive card 1']") as HTMLButtonElement;
    const next = fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']") as HTMLButtonElement;

    // when both adjacent pages are requested
    previous.click();
    next.click();
    fixture.detectChanges();

    // then page numbers are emitted while the current server page remains unchanged
    expect(emitted).toEqual([1, 3]);
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(false);
    expect(fixture.nativeElement.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain("7/30/2026");
  });

  it("keeps inspection history visible with a retryable pagination alert", () => {
    // given a server-provided page and its pagination failure are supplied
    const emitted: void[] = [];
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
      inspections: createInspections(1),
      inspectionPagination: { page: 1, pageSize: 5, totalItems: 6, totalPages: 2 },
    });
    fixture.componentRef.setInput("inspectionPaginationError", "Could not load inspections");
    fixture.componentInstance.inspectionPageRetryRequested.subscribe(() => emitted.push(undefined));

    // when the card renders and Retry is clicked
    fixture.detectChanges();
    const retry = fixture.nativeElement.querySelector("button[aria-label='Retry inspections for hive card 1']") as HTMLButtonElement;
    retry.click();

    // then the alert, existing row, paging controls, and one retry emission remain available
    expect((fixture.nativeElement.querySelector("[role='alert']") as HTMLElement).textContent).toContain("Could not load inspections");
    expect(fixture.nativeElement.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(fixture.nativeElement.querySelector("button[aria-label='Previous inspections for hive card 1']")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']")).not.toBeNull();
    expect(emitted).toHaveLength(1);
  });

  it("shows pagination failures without inspection rows", () => {
    // given an empty server-provided page has failed to paginate
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
      inspections: [],
      inspectionPagination: { page: 1, pageSize: 5, totalItems: 0, totalPages: 0 },
    });
    fixture.componentRef.setInput("inspectionPaginationError", "Could not load inspections");

    // when the card renders
    fixture.detectChanges();

    // then its alert and scoped retry remain visible without a table or empty message
    expect(fixture.nativeElement.querySelector("[role='alert']")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("button[aria-label='Retry inspections for hive card 1']")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("table")).toBeNull();
    expect(fixture.nativeElement.querySelector(".empty-state")).toBeNull();
  });

  it("disables retry and server pagination while loading", () => {
    // given a failed paginated card starts loading its retry
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
      inspections: createInspections(1),
      inspectionPagination: { page: 2, pageSize: 5, totalItems: 11, totalPages: 3 },
    });
    fixture.componentRef.setInput("inspectionPaginationError", "Could not load inspections");
    fixture.componentRef.setInput("loadingInspections", true);

    // when the card renders
    fixture.detectChanges();

    // then retry and both adjacent page controls are disabled
    expect((fixture.nativeElement.querySelector("button[aria-label='Retry inspections for hive card 1']") as HTMLButtonElement).disabled).toBe(true);
    expect((fixture.nativeElement.querySelector("button[aria-label='Previous inspections for hive card 1']") as HTMLButtonElement).disabled).toBe(true);
    expect((fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']") as HTMLButtonElement).disabled).toBe(true);
  });

  it("emits the selected inspection from history", () => {
    // given a hive has one historical inspection
    const inspection = { inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-30", inspectionTime: "09:15", queenRight: true, eggs: true, larva: true, cappedBrood: true, broodPattern: null, additionalNotes: null };
    const emitted: unknown[] = [];
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: [inspection] });
    fixture.componentInstance.viewInspection.subscribe((value) => emitted.push(value));
    fixture.detectChanges();

    // when its date cell is clicked
    fixture.nativeElement.querySelector("tbody td:first-child").click();

    // then that inspection is emitted
    expect(emitted).toEqual([inspection]);
  });
});

