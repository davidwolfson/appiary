import { Component, OnInit, inject, signal } from "@angular/core";

import { AuthStore } from "../auth/auth.store";
import { EditHiveModalComponent } from "./edit-hive-modal.component";
import { HiveCardComponent } from "./hive-card.component";
import { HivesStore } from "./hives.store";
import type { CreateHiveRequest } from "@appiary/types";

@Component({
  selector: "app-hives-dashboard",
  standalone: true,
  imports: [EditHiveModalComponent, HiveCardComponent],
  templateUrl: "./hives-dashboard.component.html",
})
export class HivesDashboardComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly hivesStore = inject(HivesStore);
  protected readonly isModalOpen = signal(false);

  ngOnInit(): void {
    void this.hivesStore.loadHives();
  }

  protected openAddHiveModal(): void {
    this.hivesStore.clearCreateError();
    this.isModalOpen.set(true);
  }

  protected closeAddHiveModal(): void {
    this.isModalOpen.set(false);
  }

  protected async createHive(payload: CreateHiveRequest): Promise<void> {
    try {
      await this.hivesStore.createHive(payload);
      this.isModalOpen.set(false);
    } catch {
      // Store state carries the create error for the modal.
    }
  }

  protected async logout(): Promise<void> {
    await this.authStore.logout();
  }
}
