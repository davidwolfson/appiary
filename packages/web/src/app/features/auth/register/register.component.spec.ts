import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { vi } from "vitest";

import { AuthStore } from "../auth.store";
import { RegisterComponent } from "./register.component";

describe("RegisterComponent", () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let componentApi: {
    form: {
      errors: { passwordMismatch?: boolean } | null;
      touched: boolean;
      setValue: (value: {
        accountName: string;
        email: string;
        password: string;
        confirmPassword: string;
      }) => void;
    };
    submit: () => Promise<void>;
  };
  let authStore: {
    error: () => string | null;
    isLoading: () => boolean;
    register: (payload: {
      accountName: string;
      email: string;
      password: string;
      confirmPassword: string;
    }) => Promise<void>;
  };

  beforeEach(async () => {
    authStore = {
      error: vi.fn(() => null),
      isLoading: vi.fn(() => false),
      register: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthStore, useValue: authStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    componentApi = component as never as typeof componentApi;
    fixture.detectChanges();
  });

  it("creates the component", () => {
    expect(component).toBeTruthy();
  });

  it("does not submit while the form is invalid", async () => {
    await componentApi.submit();

    expect(authStore.register).not.toHaveBeenCalled();
    expect(componentApi.form.touched).toBe(true);
  });

  it("does not submit when passwords do not match", async () => {
    componentApi.form.setValue({
      accountName: "Apiary",
      email: "beekeeper@example.com",
      password: "secret123",
      confirmPassword: "secret456",
    });

    await componentApi.submit();

    expect(authStore.register).not.toHaveBeenCalled();
    expect(componentApi.form.errors).toEqual({ passwordMismatch: true });
  });

  it("submits the form values through the auth store", async () => {
    componentApi.form.setValue({
      accountName: "Apiary",
      email: "beekeeper@example.com",
      password: "secret123",
      confirmPassword: "secret123",
    });

    await componentApi.submit();

    expect(authStore.register).toHaveBeenCalledWith({
      accountName: "Apiary",
      email: "beekeeper@example.com",
      password: "secret123",
      confirmPassword: "secret123",
    });
  });
});
