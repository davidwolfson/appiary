import { DOCUMENT } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";

import { AuthStore } from "../auth/auth.store";
import { EditHiveModalComponent } from "./edit-hive-modal.component";
import { HiveCardComponent } from "./hive-card.component";
import { HivesStore } from "./hives.store";
import type { CreateHiveRequest } from "@appiary/types";
import type { HiveViewModel } from "./hives.mapper";

@Component({
  selector: "app-hives-dashboard",
  standalone: true,
  imports: [EditHiveModalComponent, HiveCardComponent],
  templateUrl: "./hives-dashboard.component.html",
})
export class HivesDashboardComponent implements OnInit {
  private readonly document = inject(DOCUMENT);
  private modalTrigger: HTMLElement | null = null;

  protected readonly authStore = inject(AuthStore);
  protected readonly hivesStore = inject(HivesStore);
  protected readonly isModalOpen = signal(false);
  protected readonly selectedHive = signal<HiveViewModel | null>(null);

  ngOnInit(): void {
    void this.hivesStore.loadHives();
  }

  protected openAddHiveModal(): void {
    this.captureModalTrigger();
    this.hivesStore.clearCreateError();
    this.hivesStore.clearUpdateError();
    this.selectedHive.set(null);
    this.isModalOpen.set(true);
  }

  protected openEditHiveModal(hive: HiveViewModel): void {
    this.captureModalTrigger();
    this.hivesStore.clearCreateError();
    this.hivesStore.clearUpdateError();
    this.selectedHive.set(hive);
    this.isModalOpen.set(true);
  }

  protected closeAddHiveModal(): void {
    this.closeModal();
  }

  protected async saveHive(payload: CreateHiveRequest): Promise<void> {
    try {
      const selectedHive = this.selectedHive();
      if (selectedHive) {
        await this.hivesStore.updateHive(selectedHive.hiveId, payload);
      } else {
        await this.hivesStore.createHive(payload);
      }
      this.closeModal();
    } catch {
      // Store state carries the create/update error for the modal.
    }
  }

  protected async logout(): Promise<void> {
    await this.authStore.logout();
  }

  private captureModalTrigger(): void {
    const activeElement = this.document.activeElement;
    this.modalTrigger = activeElement instanceof HTMLElement ? activeElement : null;
  }

  private closeModal(): void {
    const trigger = this.modalTrigger;
    this.isModalOpen.set(false);
    this.selectedHive.set(null);
    this.modalTrigger = null;

    queueMicrotask(() => {
      if (trigger?.isConnected) {
        trigger.focus();
        return;
      }

      this.document.querySelector<HTMLElement>("[aria-label='Add Hive']")?.focus();
    });
  }
}
