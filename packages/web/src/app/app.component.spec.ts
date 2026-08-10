import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, RouterOutlet } from "@angular/router";

import { AppComponent } from "./app.component";

describe("AppComponent", () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  it("renders the application router outlet", () => {
    // given the root application component is created

    // when its view is rendered
    fixture.detectChanges();

    // then routed pages have an outlet to render into
    expect(fixture.debugElement.query((element) => element.providerTokens.includes(RouterOutlet))).not.toBeNull();
  });
});
