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

  protected formatInspectionDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return value;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const daysInMonth = [31, this.isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) return value;

    return `${month}/${day}/${year}`;
  }

  protected inspectionSummary(inspection: HiveInspectionViewModel): string {
    const broodPattern = inspection.broodPattern === "good"
      ? "3"
      : inspection.broodPattern === "fair"
        ? "2"
        : inspection.broodPattern === "poor"
          ? "1"
          : "";

    return [
      inspection.queenRight ? "QR" : "",
      inspection.eggs ? "E" : "",
      inspection.larva ? "L" : "",
      inspection.cappedBrood ? "CB" : "",
      broodPattern,
    ].join("");
  }

  protected inspectionDescription(inspection: HiveInspectionViewModel): string | null {
    const description = inspection.additionalNotes?.trim();
    return description ? description : null;
  }

  protected openInspection(inspection: HiveInspectionViewModel, row: HTMLTableRowElement): void {
    row.focus();
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

  private isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
}
