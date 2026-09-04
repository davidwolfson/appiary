import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { vi } from "vitest";

import { EditHiveModalComponent } from "./edit-hive-modal.component";

describe("EditHiveModalComponent", () => {
  let fixture: ComponentFixture<EditHiveModalComponent>;
  let component: EditHiveModalComponent;
  let componentApi: {
    form: {
      disabled: boolean;
      controls: {
        apiaryId: { disabled: boolean; setValue: (value: string) => void };
        name: { disabled: boolean; setValue: (value: string) => void };
        status: { disabled: boolean; setValue: (value: boolean) => void };
      };
    };
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditHiveModalComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(EditHiveModalComponent);
    component = fixture.componentInstance;
    componentApi = component as never as typeof componentApi;
    fixture.componentRef.setInput("apiaries", [
      { apiaryId: "apiary-1", name: "Home Apiary", status: true },
      { apiaryId: "apiary-2", name: "Orchard", status: false },
    ]);
    fixture.componentRef.setInput("currentApiaryId", "apiary-1");
    fixture.detectChanges();
  });

  it("renders required fields", () => {
    // given the hive modal is open
    // when the modal view is rendered
    // then the apiary, name, and status fields are visible
    expect(fixture.nativeElement.textContent).toContain("Apiary");
    expect(fixture.nativeElement.textContent).toContain("Hive Name");
    expect(fixture.nativeElement.textContent).toContain("Status");
  });

  it("lists active and inactive apiaries", () => {
    // given active and inactive apiaries are available
    // when the modal view is rendered
    const options = Array.from(
      (fixture.nativeElement.querySelector("#hive-apiary") as HTMLSelectElement).options,
      (option) => option.textContent?.trim(),
    );

    // then every apiary remains available for assignment
    expect(options).toContain("Home Apiary");
    expect(options).toContain("Orchard (Inactive)");
  });

  it("defaults Add Hive to the dashboard apiary", () => {
    // given add mode is opened from the Home Apiary dashboard
    // when the modal view is rendered
    const apiarySelect = fixture.nativeElement.querySelector("#hive-apiary") as HTMLSelectElement;

    // then the dashboard apiary is selected
    expect(apiarySelect.value).toBe("apiary-1");
  });

  it("moves initial focus to the name field", () => {
    // given the hive modal has rendered
    const nameInput = fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement;

    // when the initial focus placement completes
    fixture.detectChanges();

    // then keyboard focus starts in the name field
    expect(document.activeElement).toBe(nameInput);
  });

  it("wraps focus within the dialog", () => {
    // given focus is on the final enabled control in the dialog
    const dialog = fixture.nativeElement.querySelector("[role='dialog']") as HTMLElement;
    const saveButton = fixture.nativeElement.querySelector("button[type='submit']") as HTMLButtonElement;
    const closeButton = fixture.nativeElement.querySelector("[aria-label='Close']") as HTMLButtonElement;
    saveButton.focus();

    // when Tab is pressed
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));

    // then focus wraps to the first enabled control
    expect(document.activeElement).toBe(closeButton);
  });

  it("closes on Escape", () => {
    // given a close listener is subscribed
    const closed = vi.fn();
    component.closed.subscribe(closed);

    // when Escape is pressed within the dialog
    fixture.nativeElement
      .querySelector("[role='dialog']")
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

    // then the close event is emitted
    expect(closed).toHaveBeenCalledOnce();
  });

  it("does not close on Escape while saving", () => {
    // given the modal is saving
    const closed = vi.fn();
    component.closed.subscribe(closed);
    fixture.componentRef.setInput("isSaving", true);
    fixture.detectChanges();

    // when Escape is pressed within the dialog
    fixture.nativeElement
      .querySelector("[role='dialog']")
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

    // then the close event is not emitted
    expect(closed).not.toHaveBeenCalled();
  });

  it("renders Add Hive title by default", () => {
    // given the modal has no selected hive
    // when the modal view is rendered
    // then add mode title is visible
    expect(fixture.nativeElement.textContent).toContain("Add Hive");
  });

  it("renders Edit Hive title and selected hive values when editing", () => {
    // given a selected hive is supplied
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      apiaryId: "apiary-2",
      name: "North Field",
      status: false,
    });

    // when the modal view is rendered
    fixture.detectChanges();

    // then edit mode title and current values are visible
    expect(fixture.nativeElement.textContent).toContain("Edit Hive");
    expect((fixture.nativeElement.querySelector("#hive-apiary") as HTMLSelectElement).value).toBe("apiary-2");
    expect((fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement).value).toBe("North Field");
    expect((fixture.nativeElement.querySelector("#hive-status") as HTMLSelectElement).selectedOptions[0]?.textContent).toBe("Inactive");
  });

  it("emits close without saving", () => {
    // given a close listener is subscribed
    const closed = vi.fn();
    component.closed.subscribe(closed);

    // when the modal is closed
    component.close();

    // then the close event is emitted without a save
    expect(closed).toHaveBeenCalled();
  });

  it("blocks empty name submission", () => {
    // given the hive name is empty
    const save = vi.fn();
    component.save.subscribe(save);

    // when the modal form is submitted
    component.submit();

    // then no save event is emitted
    expect(save).not.toHaveBeenCalled();
  });

  it("blocks over-100-character name submission", () => {
    // given the hive name exceeds 100 characters
    const save = vi.fn();
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue("a".repeat(101));

    // when the modal form is submitted
    component.submit();

    // then no save event is emitted
    expect(save).not.toHaveBeenCalled();
  });

  it("blocks submission without an apiary", () => {
    // given the hive form has a name but no apiary
    const save = vi.fn();
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue("North Field");
    componentApi.form.controls.apiaryId.setValue("");

    // when the modal form is submitted
    component.submit();
    fixture.detectChanges();

    // then no save event is emitted and required feedback is visible
    expect(save).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain("Apiary is required.");
  });

  it("emits trimmed name and status on valid submit", () => {
    // given the hive form contains a padded name, reassigned apiary, and inactive status
    const save = vi.fn();
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue("  North Field  ");
    componentApi.form.controls.apiaryId.setValue("apiary-2");
    componentApi.form.controls.status.setValue(false);

    // when the modal form is submitted
    component.submit();

    // then a save event contains the trimmed name and selected status
    expect(save).toHaveBeenCalledWith({
      apiaryId: "apiary-2",
      name: "North Field",
      status: false,
    });
  });

  it("resets to selected hive values when closed in edit mode", () => {
    // given the edit modal form has been changed
    const closed = vi.fn();
    component.closed.subscribe(closed);
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      apiaryId: "apiary-2",
      name: "North Field",
      status: false,
    });
    fixture.detectChanges();
    componentApi.form.controls.name.setValue("Changed Name");
    componentApi.form.controls.apiaryId.setValue("apiary-1");
    componentApi.form.controls.status.setValue(true);

    // when the modal is closed
    component.close();
    fixture.detectChanges();

    // then the form is restored to the selected hive values
    expect((fixture.nativeElement.querySelector("#hive-apiary") as HTMLSelectElement).value).toBe("apiary-2");
    expect((fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement).value).toBe("North Field");
    expect((fixture.nativeElement.querySelector("#hive-status") as HTMLSelectElement).selectedOptions[0]?.textContent).toBe("Inactive");
    expect(closed).toHaveBeenCalled();
  });

  it("shows saving state", () => {
    // given the modal is saving
    fixture.componentRef.setInput("isSaving", true);

    // when the view is rendered
    fixture.detectChanges();

    // then saving feedback is visible
    expect(fixture.nativeElement.textContent).toContain("Saving...");
  });

  it("disables and re-enables the form fields with the saving state", () => {
    // given the modal is saving
    fixture.componentRef.setInput("isSaving", true);
    fixture.detectChanges();
    const nameInput = fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement;
    const apiarySelect = fixture.nativeElement.querySelector("#hive-apiary") as HTMLSelectElement;
    const statusSelect = fixture.nativeElement.querySelector("#hive-status") as HTMLSelectElement;

    // then all reactive controls and native fields are disabled
    expect(componentApi.form.disabled).toBe(true);
    expect(componentApi.form.controls.apiaryId.disabled).toBe(true);
    expect(componentApi.form.controls.name.disabled).toBe(true);
    expect(componentApi.form.controls.status.disabled).toBe(true);
    expect(nameInput.disabled).toBe(true);
    expect(apiarySelect.disabled).toBe(true);
    expect(statusSelect.disabled).toBe(true);

    // when saving finishes
    fixture.componentRef.setInput("isSaving", false);
    fixture.detectChanges();

    // then the form fields are interactive again
    expect(componentApi.form.disabled).toBe(false);
    expect(componentApi.form.controls.apiaryId.disabled).toBe(false);
    expect(componentApi.form.controls.name.disabled).toBe(false);
    expect(componentApi.form.controls.status.disabled).toBe(false);
    expect(nameInput.disabled).toBe(false);
    expect(apiarySelect.disabled).toBe(false);
    expect(statusSelect.disabled).toBe(false);
  });

  it("keeps the form disabled when selected hive values reset while saving", () => {
    // given the modal is saving
    fixture.componentRef.setInput("isSaving", true);
    fixture.detectChanges();

    // when the selected hive changes
    fixture.componentRef.setInput("hive", {
      hiveId: "hive-1",
      apiaryId: "apiary-2",
      name: "North Field",
      status: false,
    });
    fixture.detectChanges();

    // then the new values are populated without unlocking the form
    expect(componentApi.form.disabled).toBe(true);
    expect((fixture.nativeElement.querySelector("#hive-apiary") as HTMLSelectElement).value).toBe("apiary-2");
    expect((fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement).value).toBe("North Field");
    expect((fixture.nativeElement.querySelector("#hive-name") as HTMLInputElement).disabled).toBe(true);
    expect((fixture.nativeElement.querySelector("#hive-apiary") as HTMLSelectElement).disabled).toBe(true);
    expect((fixture.nativeElement.querySelector("#hive-status") as HTMLSelectElement).disabled).toBe(true);
  });

  it("moves focus to the dialog when no controls are enabled while saving", () => {
    // given every interactive control is disabled by the saving state
    fixture.componentRef.setInput("isSaving", true);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector("[role='dialog']") as HTMLElement;

    // when Tab is pressed
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));

    // then focus remains contained by the dialog
    expect(document.activeElement).toBe(dialog);
  });

  it("does not emit a save while saving", () => {
    // given the modal has a valid form and is already saving
    const save = vi.fn();
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue("North Field");
    fixture.componentRef.setInput("isSaving", true);
    fixture.detectChanges();

    // when submission is invoked programmatically
    component.submit();

    // then a duplicate save is not emitted
    expect(save).not.toHaveBeenCalled();
  });

  it("shows create error feedback", () => {
    // given the create request failed
    fixture.componentRef.setInput("error", "Hive name already exists");

    // when the view is rendered
    fixture.detectChanges();

    // then the API error is visible
    expect(fixture.nativeElement.textContent).toContain("Hive name already exists");
  });
});
