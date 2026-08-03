import { Component, EventEmitter, Input, Output } from "@angular/core";

import type { HiveInspectionViewModel, HiveViewModel } from "./hives.mapper";

@Component({
  selector: "app-hive-card",
  standalone: true,
  templateUrl: "./hive-card.component.html",
})
export class HiveCardComponent {
  private hiveValue!: HiveViewModel;
  private legacyCurrentPage = 0;

  @Input({ required: true })
  set hive(hive: HiveViewModel) {
    this.hiveValue = hive;
    this.legacyCurrentPage = 0;
  }

  get hive(): HiveViewModel {
    return this.hiveValue;
  }

  @Output()
  readonly edit = new EventEmitter<HiveViewModel>();

  @Output()
  readonly addInspection = new EventEmitter<HiveViewModel>();

  @Output()
  readonly viewInspection = new EventEmitter<HiveInspectionViewModel>();

  @Input()
  loadingInspections = false;

  @Input({ required: true })
  cardIndex!: number;

  @Output()
  readonly inspectionPageRequested = new EventEmitter<number>();

  protected get inspections(): HiveInspectionViewModel[] {
    if (this.hive.inspectionPagination) return this.hive.inspections ?? [];
    const start = this.legacyCurrentPage * 5;
    return (this.hive.inspections ?? []).slice(start, start + 5);
  }

  protected get hasInspectionPagination(): boolean {
    return this.pagination.totalPages > 1;
  }

  protected get isPreviousPageDisabled(): boolean {
    return this.loadingInspections || this.pagination.page <= 1;
  }

  protected get isNextPageDisabled(): boolean {
    return this.loadingInspections || this.pagination.page >= this.pagination.totalPages;
  }

  protected get statusLabel(): string {
    return this.hive.status ? "Active" : "Inactive";
  }

  protected editHive(): void {
    this.edit.emit(this.hive);
  }

  protected inspectHive(): void {
    this.addInspection.emit(this.hive);
  }

  protected openInspection(inspection: HiveInspectionViewModel): void {
    this.viewInspection.emit(inspection);
  }

  protected showPreviousInspections(): void {
    if (!this.hive.inspectionPagination) {
      this.legacyCurrentPage = Math.max(0, this.legacyCurrentPage - 1);
      return;
    }
    this.inspectionPageRequested.emit(this.pagination.page - 1);
  }

  protected showNextInspections(): void {
    if (!this.hive.inspectionPagination) {
      this.legacyCurrentPage = Math.min(this.pagination.totalPages - 1, this.legacyCurrentPage + 1);
      return;
    }
    this.inspectionPageRequested.emit(this.pagination.page + 1);
  }

  private get pagination() {
    return this.hive.inspectionPagination ?? {
      page: this.legacyCurrentPage + 1,
      pageSize: 5,
      totalItems: this.hive.inspections?.length ?? 0,
      totalPages: Math.ceil((this.hive.inspections?.length ?? 0) / 5),
    };
  }
}
