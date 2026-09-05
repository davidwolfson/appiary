import { DOCUMENT } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";

import { AuthStore } from "../auth/auth.store";
import { AddApiaryModalComponent } from "./add-apiary-modal.component";
import { EditHiveModalComponent, type HiveFormValue } from "./edit-hive-modal.component";
import { HiveCardComponent } from "./hive-card.component";
import { HiveInspectionModalComponent } from "./hive-inspection-modal.component";
import { HivesStore } from "./hives.store";
import { ApiariesStore } from "./apiaries.store";
import type { CreateHiveInspectionRequest } from "@appiary/types";
import type { HiveInspectionViewModel, HiveViewModel } from "./hives.mapper";

type HiveStatusFilter = "active" | "all" | "inactive";

@Component({
  selector: "app-hives-dashboard",
  standalone: true,
  imports: [AddApiaryModalComponent, EditHiveModalComponent, HiveCardComponent, HiveInspectionModalComponent],
  templateUrl: "./hives-dashboard.component.html",
})
export class HivesDashboardComponent implements OnInit {
  private readonly document = inject(DOCUMENT);
  private modalTrigger: HTMLElement | null = null;

  protected readonly authStore = inject(AuthStore);
  protected readonly hivesStore = inject(HivesStore);
  protected readonly apiariesStore = inject(ApiariesStore);
  protected readonly isModalOpen = signal(false);
  protected readonly isAddApiaryModalOpen = signal(false);
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
  protected readonly hasOpenModal = computed(() => this.isAddApiaryModalOpen() || this.isModalOpen() || this.inspectionHive() !== null);

  ngOnInit(): void {
    void this.apiariesStore.loadApiaries();
  }

  protected openAddHiveModal(): void {
    this.captureModalTrigger();
    this.hivesStore.clearCreateError();
    this.hivesStore.clearUpdateError();
    this.selectedHive.set(null);
    this.inspectionHive.set(null);
    this.isModalOpen.set(true);
  }

  protected openAddApiaryModal(): void {
    this.captureModalTrigger();
    this.apiariesStore.clearCreateError();
    this.isAddApiaryModalOpen.set(true);
  }

  protected selectApiary(event: Event): void {
    const apiaryId = (event.target as HTMLSelectElement).value;
    if (apiaryId) void this.apiariesStore.selectApiary(apiaryId);
  }

  protected retryApiaries(): void {
    void this.apiariesStore.loadApiaries();
  }

  protected retryHives(): void {
    const apiaryId = this.apiariesStore.selectedApiaryId();
    if (apiaryId) void this.hivesStore.loadHives(apiaryId);
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

  protected closeAddApiaryModal(): void {
    this.closeModal();
  }

  protected async saveApiary(payload: { name: string }): Promise<void> {
    try {
      await this.apiariesStore.createApiary(payload);
      this.closeModal();
    } catch {
      // Store state carries the create error for the modal.
    }
  }

  protected async saveHive(formValue: HiveFormValue): Promise<void> {
    try {
      const selectedHive = this.selectedHive();
      if (selectedHive) {
        await this.hivesStore.updateHive(selectedHive.hiveId, formValue);
      } else {
        await this.hivesStore.createHive(formValue);
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

  private captureModalTrigger(): void {
    const activeElement = this.document.activeElement;
    this.modalTrigger = activeElement instanceof HTMLElement ? activeElement : null;
  }

  private closeModal(): void {
    const trigger = this.modalTrigger;
    this.isModalOpen.set(false);
    this.isAddApiaryModalOpen.set(false);
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
