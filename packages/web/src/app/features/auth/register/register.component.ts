import { Component, inject } from "@angular/core";
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { AuthStore } from "../auth.store";

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get("password")?.value;
  const confirmPassword = control.get("confirmPassword")?.value;

  if (password === confirmPassword) {
    return null;
  }

  return { passwordMismatch: true };
}

@Component({
  selector: "app-register",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./register.component.html",
})
export class RegisterComponent {
  protected readonly authStore = inject(AuthStore);

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    accountName: ["", [Validators.required, Validators.maxLength(255)]],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    confirmPassword: ["", [Validators.required]],
  }, {
    validators: [passwordsMatchValidator],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      await this.authStore.register(this.form.getRawValue());
    } catch {
      // Store state already carries the API error for the template.
    }
  }
}
