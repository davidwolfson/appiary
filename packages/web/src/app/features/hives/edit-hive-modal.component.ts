import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import type { CreateHiveRequest } from "@appiary/types";
import type { ApiaryViewModel } from "./apiaries.mapper";
import type { HiveViewModel } from "./hives.mapper";

export type HiveFormValue = CreateHiveRequest;

@Component({
  selector: "app-edit-hive-modal",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./edit-hive-modal.component.html",
})
export class EditHiveModalComponent implements AfterViewInit, OnChanges {
  @ViewChild("dialog", { static: true })
  private readonly dialog!: ElementRef<HTMLElement>;

  @ViewChild("nameInput", { static: true })
  private readonly nameInput!: ElementRef<HTMLInputElement>;

  @Input()
  isSaving = false;

  @Input()
  error: string | null = null;

  @Input()
  hive: HiveViewModel | null = null;

  @Input()
  apiaries: ApiaryViewModel[] = [];

  @Input()
  currentApiaryId: string | null = null;

  @Output()
  readonly save = new EventEmitter<HiveFormValue>();

  @Output()
  readonly closed = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    apiaryId: ["", [Validators.required]],
    name: ["", [Validators.required, Validators.maxLength(100)]],
    status: [true],
  });

  protected get title(): string {
    return this.hive ? "Edit Hive" : "Add Hive";
  }

  ngAfterViewInit(): void {
    this.nameInput.nativeElement.focus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ("hive" in changes || ("currentApiaryId" in changes && !this.hive)) {
      this.resetForm();
    }

    if ("isSaving" in changes) {
      if (this.isSaving) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    }
  }

  close(): void {
    if (this.isSaving) {
      return;
    }

    this.resetForm();
    this.closed.emit();
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      this.dialog.nativeElement.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = this.dialog.nativeElement.ownerDocument.activeElement;

    if (event.shiftKey && (activeElement === firstElement || !this.dialog.nativeElement.contains(activeElement))) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && (activeElement === lastElement || !this.dialog.nativeElement.contains(activeElement))) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  submit(): void {
    if (this.isSaving) {
      return;
    }

    const trimmedName = this.form.controls.name.value.trim();
    this.form.controls.name.setValue(trimmedName);

    if (this.form.invalid || trimmedName.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit({
      apiaryId: this.form.controls.apiaryId.value,
      name: trimmedName,
      status: this.form.controls.status.value,
    });
  }

  resetForm(): void {
    this.form.reset({
      apiaryId: this.hive?.apiaryId ?? this.currentApiaryId ?? "",
      name: this.hive?.name ?? "",
      status: this.hive?.status ?? true,
    });
  }

  private getFocusableElements(): HTMLElement[] {
    return Array.from(
      this.dialog.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
  }
}
