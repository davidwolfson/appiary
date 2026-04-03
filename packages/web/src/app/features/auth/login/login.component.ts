import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { AuthStore } from "../auth.store";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./login.component.html",
})
export class LoginComponent {
  protected readonly authStore = inject(AuthStore);

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      await this.authStore.login(this.form.getRawValue());
    } catch {
      // Store state already carries the API error for the template.
    }
  }
}
