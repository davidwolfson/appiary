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

  it("renders the hive name and active status", () => {
    // given an active hive is supplied to the card
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
    });

    // when the card view is rendered
    fixture.detectChanges();

    // then the hive name and active status are visible
    expect(fixture.nativeElement.textContent).toContain("North Field");
    expect(fixture.nativeElement.textContent).toContain("Active");
  });

  it("renders inactive status", () => {
    // given an inactive hive is supplied to the card
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: false,
    });

    // when the card view is rendered
    fixture.detectChanges();

    // then the inactive status is visible
    expect(fixture.nativeElement.textContent).toContain("Inactive");
  });

  it("renders an edit button with tooltip text", () => {
    // given a hive is supplied to the card
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
    });

    // when the card view is rendered
    fixture.detectChanges();

    // then the edit affordance is exposed with the required label and title
    const editButton = fixture.nativeElement.querySelector("button[aria-label='Edit Hive for hive card 1']") as HTMLButtonElement;
    const card = fixture.nativeElement.querySelector("article") as HTMLElement;
    expect(editButton).not.toBeNull();
    expect(editButton.title).toBe("Edit Hive");
    expect(card.dataset["testid"]).toBe("hive-card-hive-1");
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

  it("omits history when there are no inspections", () => {
    // given a hive has empty inspection history
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: [] });

    // when the card renders
    fixture.detectChanges();

    // then no history table is displayed
    expect(fixture.nativeElement.querySelector("table")).toBeNull();
  });

  it("paginates history in groups of five with accessible boundary controls", () => {
    // given a hive has six inspections
    const inspections = createInspections(6);
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections });

    // when the card renders
    fixture.detectChanges();

    // then the newest five and correctly labelled boundary controls are shown
    const previous = fixture.nativeElement.querySelector("button[aria-label='Previous inspections for hive card 1']") as HTMLButtonElement;
    const next = fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']") as HTMLButtonElement;
    expect(fixture.nativeElement.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(fixture.nativeElement.textContent).not.toContain("2026-07-25");
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    // when the next page is requested
    next.click();
    fixture.detectChanges();

    // then the final partial page is shown at its boundary
    expect(fixture.nativeElement.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain("2026-07-25");
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(true);
  });

  it("omits pagination for histories of five or fewer inspections", () => {
    // given a hive has exactly one full page of inspections
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: createInspections(5) });

    // when the card renders
    fixture.detectChanges();

    // then no pagination controls are displayed
    expect(fixture.nativeElement.querySelector("button[aria-label='Previous inspections for hive card 1']")).toBeNull();
    expect(fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']")).toBeNull();
  });

  it("supports middle pages and bounded previous navigation", () => {
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
    expect(fixture.nativeElement.textContent).toContain("2026-07-30");
  });

  it("resets to the first page when inspection input is replaced", () => {
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
    expect(fixture.nativeElement.textContent).toContain("2026-07-30");
  });

  it("emits an inspection opened from a later page", () => {
    // given a hive has an inspection on a second page
    const inspections = createInspections(6);
    const emitted: unknown[] = [];
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections });
    fixture.componentInstance.viewInspection.subscribe((value) => emitted.push(value));
    fixture.detectChanges();

    // when the later inspection is opened
    (fixture.nativeElement.querySelector("button[aria-label='Next inspections for hive card 1']") as HTMLButtonElement).click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector("tbody button").click();

    // then that inspection is emitted
    expect(emitted).toEqual([inspections[5]]);
  });

  it("emits the selected inspection from history", () => {
    // given a hive has one historical inspection
    const inspection = { inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-30", inspectionTime: "09:15", queenRight: true, eggs: true, larva: true, cappedBrood: true, broodPattern: null, additionalNotes: null };
    const emitted: unknown[] = [];
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: [inspection] });
    fixture.componentInstance.viewInspection.subscribe((value) => emitted.push(value));
    fixture.detectChanges();

    // when its date is clicked
    fixture.nativeElement.querySelector("tbody button").click();

    // then that inspection is emitted
    expect(emitted).toEqual([inspection]);
  });
});

