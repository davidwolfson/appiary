import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { vi } from "vitest";

import { AddApiaryModalComponent } from "./add-apiary-modal.component";

describe("AddApiaryModalComponent", () => {
  let fixture: ComponentFixture<AddApiaryModalComponent>;
  let component: AddApiaryModalComponent;
  let componentApi: {
    form: {
      disabled: boolean;
      controls: { name: { disabled: boolean; setValue(value: string): void } };
    };
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddApiaryModalComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(AddApiaryModalComponent);
    component = fixture.componentInstance;
    componentApi = component as never;
    fixture.detectChanges();
  });

  it("renders the dialog controls and initially focuses the name", () => {
    // given the modal has rendered
    const nameInput = fixture.nativeElement.querySelector("#apiary-name") as HTMLInputElement;

    // when its accessible dialog content is inspected
    const dialog = fixture.nativeElement.querySelector("[role='dialog']") as HTMLElement;

    // then all required controls are labeled and focus begins at the name
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(fixture.nativeElement.querySelector("[aria-label='Close Add Apiary']")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("[aria-label='Cancel Add Apiary']")?.textContent).toContain("Cancel");
    expect(fixture.nativeElement.querySelector("[aria-label='Save Apiary']")?.textContent).toContain("Save Apiary");
    expect(document.activeElement).toBe(nameInput);
  });

  it.each(["", "   "])("blocks a missing apiary name %#", (name) => {
    // given the name contains no non-whitespace characters
    const save = vi.fn();
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue(name);

    // when the form is submitted
    component.submit();
    fixture.detectChanges();

    // then no save occurs and required feedback is shown
    expect(save).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain("Apiary name is required.");
  });

  it("blocks names longer than 100 characters", () => {
    // given the name exceeds the supported limit
    const save = vi.fn();
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue("a".repeat(101));

    // when the form is submitted
    component.submit();
    fixture.detectChanges();

    // then no save occurs and maximum-length feedback is shown
    expect(save).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain("Apiary name must be 100 characters or fewer.");
  });

  it("emits a trimmed valid apiary name", () => {
    // given the form contains a padded valid name
    const save = vi.fn();
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue("  Orchard  ");

    // when the form is submitted
    component.submit();

    // then the normalized create request is emitted
    expect(save).toHaveBeenCalledWith({ name: "Orchard" });
  });

  it("disables form and close actions while saving", () => {
    // given the create request is saving
    fixture.componentRef.setInput("isSaving", true);

    // when the view is refreshed
    fixture.detectChanges();

    // then the field, close actions, and save action are disabled
    expect(componentApi.form.disabled).toBe(true);
    expect((fixture.nativeElement.querySelector("#apiary-name") as HTMLInputElement).disabled).toBe(true);
    for (const button of fixture.nativeElement.querySelectorAll("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    expect(fixture.nativeElement.textContent).toContain("Saving Apiary...");
  });

  it("shows create-specific API feedback without clearing the form", () => {
    // given a submitted name remains after an API failure
    componentApi.form.controls.name.setValue("Orchard");
    fixture.componentRef.setInput("error", "Apiary name already exists");

    // when the error is rendered
    fixture.detectChanges();

    // then both the name and API feedback remain visible
    expect((fixture.nativeElement.querySelector("#apiary-name") as HTMLInputElement).value).toBe("Orchard");
    expect(fixture.nativeElement.textContent).toContain("Apiary name already exists");
  });

  it("closes on Escape and traps focus in the dialog", () => {
    // given focus is on the last dialog action and a close listener is subscribed
    const closed = vi.fn();
    component.closed.subscribe(closed);
    const dialog = fixture.nativeElement.querySelector("[role='dialog']") as HTMLElement;
    const saveButton = fixture.nativeElement.querySelector("[aria-label='Save Apiary']") as HTMLButtonElement;
    const closeButton = fixture.nativeElement.querySelector("[aria-label='Close Add Apiary']") as HTMLButtonElement;
    saveButton.focus();

    // when Tab wraps and Escape is pressed
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(closeButton);
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

    // then focus stayed trapped and the modal requested closure
    expect(closed).toHaveBeenCalledOnce();
  });

  it("cannot close or save while saving", () => {
    // given all actions are locked during an active create request
    const closed = vi.fn();
    const save = vi.fn();
    component.closed.subscribe(closed);
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue("Orchard");
    fixture.componentRef.setInput("isSaving", true);
    fixture.detectChanges();

    // when close, submit, and Escape are invoked
    component.close();
    component.submit();
    fixture.nativeElement.querySelector("[role='dialog']").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );

    // then no duplicate save or close event is emitted
    expect(closed).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});
