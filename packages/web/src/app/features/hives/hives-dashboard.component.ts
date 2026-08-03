import { DOCUMENT } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";

import { AuthStore } from "../auth/auth.store";
import { EditHiveModalComponent } from "./edit-hive-modal.component";
import { HiveCardComponent } from "./hive-card.component";
import { HiveInspectionModalComponent } from "./hive-inspection-modal.component";
import { HivesStore } from "./hives.store";
import type { CreateHiveInspectionRequest, CreateHiveRequest } from "@appiary/types";
import type { HiveInspectionViewModel, HiveViewModel } from "./hives.mapper";

type HiveStatusFilter = "active" | "all" | "inactive";

@Component({
  selector: "app-hives-dashboard",
  standalone: true,
  imports: [EditHiveModalComponent, HiveCardComponent, HiveInspectionModalComponent],
  templateUrl: "./hives-dashboard.component.html",
})
export class HivesDashboardComponent implements OnInit {
  private readonly document = inject(DOCUMENT);
  private modalTrigger: HTMLElement | null = null;

  protected readonly authStore = inject(AuthStore);
  protected readonly hivesStore = inject(HivesStore);
  protected readonly isModalOpen = signal(false);
  protected readonly selectedHive = signal<HiveViewModel | null>(null);
  protected readonly inspectionHive = signal<HiveViewModel | null>(null);
  protected readonly selectedInspection = signal<HiveInspectionViewModel | null>(null);
  protected readonly hiveStatusFilter = signal<HiveStatusFilter>("active");
  protected readonly filteredHives = computed(() => {
    const filter = this.hiveStatusFilter();
    const hives = this.hivesStore.hives();

    if (filter === "all") return hives;
    return hives.filter((hive) => filter === "active" ? hive.status : !hive.status);
  });
  protected readonly hasOpenModal = computed(() => this.isModalOpen() || this.inspectionHive() !== null);

  ngOnInit(): void {
    void this.hivesStore.loadHives();
  }

  protected openAddHiveModal(): void {
    this.captureModalTrigger();
    this.hivesStore.clearCreateError();
    this.hivesStore.clearUpdateError();
    this.selectedHive.set(null);
    this.inspectionHive.set(null);
    this.isModalOpen.set(true);
  }

  protected openEditHiveModal(hive: HiveViewModel): void {
    this.captureModalTrigger();
    this.hivesStore.clearCreateError();
    this.hivesStore.clearUpdateError();
    this.selectedHive.set(hive);
    this.inspectionHive.set(null);
    this.isModalOpen.set(true);
  }

  protected openAddInspectionModal(hive: HiveViewModel): void {
    this.captureModalTrigger();
    this.isModalOpen.set(false);
    this.selectedHive.set(null);
    this.selectedInspection.set(null);
    this.hivesStore.clearInspectionError();
    this.inspectionHive.set(hive);
  }

  protected openInspectionModal(hive: HiveViewModel, inspection: HiveInspectionViewModel): void {
    this.captureModalTrigger();
    this.hivesStore.clearInspectionError();
    this.isModalOpen.set(false);
    this.selectedHive.set(null);
    this.selectedInspection.set(inspection);
    this.inspectionHive.set(hive);
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

  protected async saveInspection(payload: CreateHiveInspectionRequest): Promise<void> {
    const hive = this.inspectionHive();
    if (!hive) return;
    try {
      await this.hivesStore.createInspection(hive.hiveId, payload);
      this.closeModal();
    } catch {
      // Store state carries the inspection error for the modal.
    }
  }

  protected async logout(): Promise<void> {
    await this.authStore.logout();
  }

  protected filterHives(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === "active" || value === "all" || value === "inactive") {
      this.hiveStatusFilter.set(value);
    }
  }

  protected isLoadingInspectionPage(hiveId: string): boolean {
    return this.hivesStore.loadingInspectionHiveId?.() === hiveId;
  }

  private captureModalTrigger(): void {
    const activeElement = this.document.activeElement;
    this.modalTrigger = activeElement instanceof HTMLElement ? activeElement : null;
  }

  private closeModal(): void {
    const trigger = this.modalTrigger;
    this.isModalOpen.set(false);
    this.selectedHive.set(null);
    this.inspectionHive.set(null);
    this.selectedInspection.set(null);
    this.modalTrigger = null;

    setTimeout(() => {
      if (trigger?.isConnected) {
        trigger.focus();
        return;
      }

      this.document.querySelector<HTMLElement>("[aria-label='Add Hive']")?.focus();
    });
  }
}
