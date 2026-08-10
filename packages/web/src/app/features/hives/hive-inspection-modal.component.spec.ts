import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import type { FormGroup } from "@angular/forms";

import { HiveInspectionModalComponent } from "./hive-inspection-modal.component";

describe("HiveInspectionModalComponent", () => {
  let fixture: ComponentFixture<HiveInspectionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HiveInspectionModalComponent], providers: [provideZonelessChangeDetection()] }).compileComponents();
    fixture = TestBed.createComponent(HiveInspectionModalComponent);
    fixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: [] });
    fixture.detectChanges();
  });

  it("renders create fields and emits normalized values", () => {
    // given the create modal contains inspection details with blank notes
    const emitted: unknown[] = [];
    fixture.componentInstance.save.subscribe((value) => emitted.push(value));
    const form = (fixture.componentInstance as unknown as { form: FormGroup }).form;
    form.patchValue({ queenRight: true, eggs: true, broodPattern: "good", additionalNotes: "   " });

    // when the inspection is submitted
    (fixture.nativeElement.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit"));

    // then the exact fields are emitted and blank notes become null
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ queenRight: true, eggs: true, larva: false, cappedBrood: false, broodPattern: "good", additionalNotes: null });
    expect((emitted[0] as { inspectionDate: string }).inspectionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((emitted[0] as { inspectionTime: string }).inspectionTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it("focuses the date field when creating an inspection", () => {
    // given the create inspection modal has rendered

    // when its initial focus is applied
    fixture.detectChanges();

    // then the date field receives focus
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector("#inspection-date"));
  });

  it("focuses the enabled close button when viewing an inspection", () => {
    // given an existing inspection is supplied to a new modal
    const readOnlyFixture = TestBed.createComponent(HiveInspectionModalComponent);
    readOnlyFixture.componentRef.setInput("hive", { hiveId: "hive-1", name: "North Field", status: true, inspections: [] });
    readOnlyFixture.componentRef.setInput("inspection", { inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-30", inspectionTime: "09:15", queenRight: true, eggs: false, larva: true, cappedBrood: true, broodPattern: "fair", additionalNotes: null });

    // when the read-only modal is rendered
    readOnlyFixture.detectChanges();

    // then the enabled close button receives focus
    expect(document.activeElement).toBe(readOnlyFixture.nativeElement.querySelector("[aria-label='Close']"));
  });

  it("shows required validation without emitting an invalid inspection", () => {
    // given the required date and time are empty
    const emitted: unknown[] = [];
    fixture.componentInstance.save.subscribe((value) => emitted.push(value));
    const form = (fixture.componentInstance as unknown as { form: FormGroup }).form;
    form.patchValue({ inspectionDate: "", inspectionTime: "" });

    // when the invalid inspection is submitted
    (fixture.nativeElement.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit"));
    fixture.detectChanges();

    // then both required errors render and no save is emitted
    expect(fixture.nativeElement.textContent).toContain("Inspection date is required.");
    expect(fixture.nativeElement.textContent).toContain("Inspection time is required.");
    expect(emitted).toEqual([]);
  });

  it("disables read-only values and omits save and cancel", () => {
    // given an existing inspection is supplied
    fixture.componentRef.setInput("inspection", { inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-30", inspectionTime: "09:15", queenRight: true, eggs: false, larva: true, cappedBrood: true, broodPattern: "fair", additionalNotes: "Needs feed" });

    // when the read-only modal is rendered
    fixture.detectChanges();

    // then every form control is disabled and create actions are absent
    expect(Array.from(fixture.nativeElement.querySelectorAll("input, textarea")).every((element) => (element as HTMLInputElement).disabled)).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain("Cancel");
    expect(fixture.nativeElement.querySelector("button[type='submit']")).toBeNull();
    expect((fixture.nativeElement.querySelector("#additional-notes") as HTMLTextAreaElement).value).toBe("Needs feed");
  });

  it("keeps create controls disabled while saving and exposes errors", () => {
    // given a failed request is being displayed while save is pending
    fixture.componentRef.setInput("isSaving", true);
    fixture.componentRef.setInput("error", "Could not save inspection");

    // when the modal updates
    fixture.detectChanges();

    // then pending controls are disabled and the error remains visible
    expect((fixture.nativeElement.querySelector("button[type='submit']") as HTMLButtonElement).disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain("Could not save inspection");
  });
});
