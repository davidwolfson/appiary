import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import type { CreateHiveRequest } from "@appiary/types";
import type { HiveViewModel } from "./hives.mapper";

@Component({
  selector: "app-edit-hive-modal",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./edit-hive-modal.component.html",
})
export class EditHiveModalComponent implements OnChanges {
  @Input()
  isSaving = false;

  @Input()
  error: string | null = null;

  @Input()
  hive: HiveViewModel | null = null;

  @Output()
  readonly save = new EventEmitter<CreateHiveRequest>();

  @Output()
  readonly closed = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(100)]],
    status: [true],
  });

  protected get title(): string {
    return this.hive ? "Edit Hive" : "Add Hive";
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ("hive" in changes) {
      this.resetForm();
    }
  }

  close(): void {
    if (this.isSaving) {
      return;
    }

    this.resetForm();
    this.closed.emit();
  }

  submit(): void {
    const trimmedName = this.form.controls.name.value.trim();
    this.form.controls.name.setValue(trimmedName);

    if (this.form.invalid || trimmedName.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit({
      name: trimmedName,
      status: this.form.controls.status.value,
    });
  }

  resetForm(): void {
    this.form.reset({
      name: this.hive?.name ?? "",
      status: this.hive?.status ?? true,
    });
  }
}
