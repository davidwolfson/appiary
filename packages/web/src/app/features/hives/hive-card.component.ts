import { Component, EventEmitter, Input, Output } from "@angular/core";

import type { HiveViewModel } from "./hives.mapper";

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

  protected get statusLabel(): string {
    return this.hive.status ? "Active" : "Inactive";
  }

  protected editHive(): void {
    this.edit.emit(this.hive);
  }
}
