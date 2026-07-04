import { Component, Input } from "@angular/core";

import type { HiveViewModel } from "./hives.mapper";

@Component({
  selector: "app-hive-card",
  standalone: true,
  templateUrl: "./hive-card.component.html",
})
export class HiveCardComponent {
  @Input({ required: true })
  hive!: HiveViewModel;

  protected get statusLabel(): string {
    return this.hive.status ? "Active" : "Inactive";
  }
}
