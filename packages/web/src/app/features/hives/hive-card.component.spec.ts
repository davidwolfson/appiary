import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { HiveCardComponent } from "./hive-card.component";

describe("HiveCardComponent", () => {
  let fixture: ComponentFixture<HiveCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HiveCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(HiveCardComponent);
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
    const editButton = fixture.nativeElement.querySelector("button[aria-label='Edit Hive']") as HTMLButtonElement;
    const card = fixture.nativeElement.querySelector("article") as HTMLElement;
    expect(editButton).not.toBeNull();
    expect(editButton.title).toBe("Edit Hive");
    expect(card.dataset["testid"]).toBe("hive-card-hive-1");
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
    fixture.nativeElement.querySelector("button[aria-label='Edit Hive']").click();

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
    fixture.nativeElement.querySelector("[aria-label='Add Inspection']").click();

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

  it("renders at most five history rows", () => {
    // given a hive has six inspections
    const inspections = Array.from({ length: 6 }, (_, index) => ({ inspectionId: `inspection-${index}`, hiveId: "hive-1", inspectionDate: `2026-07-${30 - index}`, inspectionTime: "09:15", queenRight: true, eggs: true, larva: true, cappedBrood: true, broodPattern: null, additionalNotes: null }));
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections });

    // when the card renders
    fixture.detectChanges();

    // then only the first five inspections are shown
    expect(fixture.nativeElement.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(fixture.nativeElement.textContent).not.toContain("2026-07-25");
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
