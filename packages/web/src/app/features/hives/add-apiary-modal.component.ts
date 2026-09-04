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

import type { CreateApiaryRequest } from "@appiary/types";

@Component({
  selector: "app-add-apiary-modal",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./add-apiary-modal.component.html",
})
export class AddApiaryModalComponent implements AfterViewInit, OnChanges {
  @ViewChild("dialog", { static: true })
  private readonly dialog!: ElementRef<HTMLElement>;

  @ViewChild("nameInput", { static: true })
  private readonly nameInput!: ElementRef<HTMLInputElement>;

  @Input()
  isSaving = false;

  @Input()
  error: string | null = null;

  @Output()
  readonly save = new EventEmitter<CreateApiaryRequest>();

  @Output()
  readonly closed = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(100)]],
  });

  ngAfterViewInit(): void {
    this.nameInput.nativeElement.focus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!("isSaving" in changes)) return;

    if (this.isSaving) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  close(): void {
    if (this.isSaving) return;
    this.closed.emit();
  }

  submit(): void {
    if (this.isSaving) return;

    const trimmedName = this.form.controls.name.value.trim();
    this.form.controls.name.setValue(trimmedName);
    if (this.form.invalid || trimmedName.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit({ name: trimmedName });
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = Array.from(
      this.dialog.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
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
}
