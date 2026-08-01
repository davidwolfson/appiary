import { Component, EventEmitter, Input, Output } from "@angular/core";

import type { HiveInspectionViewModel, HiveViewModel } from "./hives.mapper";

@Component({
  selector: "app-hive-card",
  standalone: true,
  templateUrl: "./hive-card.component.html",
})
export class HiveCardComponent {
  @Input({ required: true })
  hive!: HiveViewModel;

  @Output()
  readonly edit = new EventEmitter<HiveViewModel>();

  @Output()
  readonly addInspection = new EventEmitter<HiveViewModel>();

  @Output()
  readonly viewInspection = new EventEmitter<HiveInspectionViewModel>();

  protected get inspections(): HiveInspectionViewModel[] {
    return (this.hive.inspections ?? []).slice(0, 5);
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
}
