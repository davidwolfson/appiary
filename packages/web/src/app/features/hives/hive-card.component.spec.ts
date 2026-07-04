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
});
