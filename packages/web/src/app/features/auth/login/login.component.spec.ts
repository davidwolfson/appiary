import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { vi } from "vitest";

import { AuthStore } from "../auth.store";
import { LoginComponent } from "./login.component";

describe("LoginComponent", () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let componentApi: {
    form: {
      touched: boolean;
      setValue: (value: { email: string; password: string }) => void;
    };
    submit: () => Promise<void>;
  };
  let authStore: {
    error: () => string | null;
    isLoading: () => boolean;
    login: (payload: { email: string; password: string }) => Promise<void>;
  };

  beforeEach(async () => {
    authStore = {
      error: vi.fn(() => null),
      isLoading: vi.fn(() => false),
      login: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthStore, useValue: authStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    componentApi = component as never as typeof componentApi;
    fixture.detectChanges();
  });

  it("creates the component", () => {
    // given the component test fixture is configured
    // when the component instance is created
    // then the component exists
    expect(component).toBeTruthy();
  });

  it("does not submit while the form is invalid", async () => {
    // given the form contains invalid default values
    // when the form is submitted
    await componentApi.submit();

    // then the store is not called and validation is shown
    expect(authStore.login).not.toHaveBeenCalled();
    expect(componentApi.form.touched).toBe(true);
  });

  it("submits the form values through the auth store", async () => {
    // given the form contains valid authentication values
    componentApi.form.setValue({
      email: "beekeeper@example.com",
      password: "secret",
    });

    // when the form is submitted
    await componentApi.submit();

    // then the auth store receives those values
    expect(authStore.login).toHaveBeenCalledWith({
      email: "beekeeper@example.com",
      password: "secret",
    });
  });
});
