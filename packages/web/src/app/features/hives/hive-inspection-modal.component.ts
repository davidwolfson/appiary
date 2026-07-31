import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import type { CreateHiveInspectionRequest } from "@appiary/types";
import type { HiveInspectionViewModel, HiveViewModel } from "./hives.mapper";

@Component({
  selector: "app-hive-inspection-modal",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./hive-inspection-modal.component.html",
})
export class HiveInspectionModalComponent implements AfterViewInit, OnChanges {
  @ViewChild("dialog", { static: true }) private readonly dialog!: ElementRef<HTMLElement>;
  @ViewChild("dateInput") private readonly dateInput?: ElementRef<HTMLInputElement>;
  @ViewChild("closeButton", { static: true }) private readonly closeButton!: ElementRef<HTMLButtonElement>;
  @Input({ required: true }) hive!: HiveViewModel;
  @Input() inspection: HiveInspectionViewModel | null = null;
  @Input() isSaving = false;
  @Input() error: string | null = null;
  @Output() readonly save = new EventEmitter<CreateHiveInspectionRequest>();
  @Output() readonly closed = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);
  protected readonly form = this.formBuilder.group({
    inspectionDate: ["", Validators.required], inspectionTime: ["", Validators.required],
    queenRight: [false, Validators.required], eggs: [false, Validators.required],
    larva: [false, Validators.required], cappedBrood: [false, Validators.required],
    broodPattern: [null as "good" | "fair" | "poor" | "na" | null], additionalNotes: [""],
  });

  protected get isReadOnly(): boolean { return this.inspection !== null; }

  constructor() { this.resetForm(); }

  ngAfterViewInit(): void {
    (this.isReadOnly ? this.closeButton.nativeElement : this.dateInput?.nativeElement ?? this.dialog.nativeElement).focus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ("inspection" in changes) this.resetForm();
    if (this.isReadOnly || this.isSaving) this.form.disable({ emitEvent: false });
    else this.form.enable({ emitEvent: false });
  }

  close(): void { if (!this.isSaving) this.closed.emit(); }

  submit(): void {
    if (this.isSaving || this.isReadOnly || this.form.invalid) return;
    const value = this.form.getRawValue();
    this.save.emit({
      inspectionDate: value.inspectionDate!, inspectionTime: value.inspectionTime!,
      queenRight: value.queenRight!, eggs: value.eggs!, larva: value.larva!, cappedBrood: value.cappedBrood!,
      broodPattern: value.broodPattern, additionalNotes: value.additionalNotes?.trim() || null,
    });
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") { event.preventDefault(); this.close(); return; }
    if (event.key !== "Tab") return;
    const elements = Array.from(this.dialog.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (!elements.length) { event.preventDefault(); this.dialog.nativeElement.focus(); return; }
    const active = this.dialog.nativeElement.ownerDocument.activeElement;
    if (event.shiftKey && (active === elements[0] || !this.dialog.nativeElement.contains(active))) { event.preventDefault(); elements.at(-1)!.focus(); }
    else if (!event.shiftKey && (active === elements.at(-1) || !this.dialog.nativeElement.contains(active))) { event.preventDefault(); elements[0].focus(); }
  }

  private resetForm(): void {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const inspection = this.inspection;
    this.form.reset({
      inspectionDate: inspection?.inspectionDate ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      inspectionTime: inspection?.inspectionTime ?? `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      queenRight: inspection?.queenRight ?? false, eggs: inspection?.eggs ?? false,
      larva: inspection?.larva ?? false, cappedBrood: inspection?.cappedBrood ?? false,
      broodPattern: inspection?.broodPattern ?? null, additionalNotes: inspection?.additionalNotes ?? "",
    });
  }
}
