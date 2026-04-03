import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { AuthStore } from "../auth/auth.store";
import { HomeComponent } from "./home.component";

describe("HomeComponent", () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let componentApi: {
    logout: () => Promise<void>;
  };
  let authStore: {
    isLoading: jasmine.Spy<() => boolean>;
    logout: jasmine.Spy<() => Promise<void>>;
    user: jasmine.Spy<() => { accountName: string; email: string } | null>;
  };

  beforeEach(async () => {
    authStore = {
      isLoading: jasmine.createSpy("isLoading").and.returnValue(false),
      logout: jasmine.createSpy("logout").and.resolveTo(),
      user: jasmine.createSpy("user").and.returnValue({
        accountName: "Apiary",
        email: "beekeeper@example.com",
      }),
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthStore, useValue: authStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    componentApi = component as never as typeof componentApi;
    fixture.detectChanges();
  });

  it("creates the component", () => {
    expect(component).toBeTruthy();
  });

  it("delegates logout through the auth store", async () => {
    await componentApi.logout();

    expect(authStore.logout).toHaveBeenCalled();
  });
});
