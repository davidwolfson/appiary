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
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: true,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("North Field");
    expect(fixture.nativeElement.textContent).toContain("Active");
  });

  it("renders inactive status", () => {
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      name: "North Field",
      status: false,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Inactive");
  });
});
