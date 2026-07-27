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
    expect(editButton).not.toBeNull();
    expect(editButton.title).toBe("Edit Hive");
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
});
