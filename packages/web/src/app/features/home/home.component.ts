import { Component, inject } from "@angular/core";

import { AuthStore } from "../auth/auth.store";

@Component({
  selector: "app-home",
  standalone: true,
  templateUrl: "./home.component.html",
})
export class HomeComponent {
  protected readonly authStore = inject(AuthStore);

  protected async logout(): Promise<void> {
    await this.authStore.logout();
  }
}
