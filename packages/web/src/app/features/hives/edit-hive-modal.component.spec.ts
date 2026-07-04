import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { vi } from "vitest";

import { EditHiveModalComponent } from "./edit-hive-modal.component";

describe("EditHiveModalComponent", () => {
  let fixture: ComponentFixture<EditHiveModalComponent>;
  let component: EditHiveModalComponent;
  let componentApi: {
    form: {
      controls: {
        name: { setValue: (value: string) => void };
        status: { setValue: (value: boolean) => void };
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
    fixture.detectChanges();
  });

  it("renders required fields", () => {
    // given the hive modal is open
    // when the modal view is rendered
    // then the name and status fields are visible
    expect(fixture.nativeElement.textContent).toContain("Hive Name");
    expect(fixture.nativeElement.textContent).toContain("Status");
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

  it("emits trimmed name and status on valid submit", () => {
    // given the hive form contains a padded name and inactive status
    const save = vi.fn();
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue("  North Field  ");
    componentApi.form.controls.status.setValue(false);

    // when the modal form is submitted
    component.submit();

    // then a save event contains the trimmed name and selected status
    expect(save).toHaveBeenCalledWith({
      name: "North Field",
      status: false,
    });
  });

  it("shows saving state", () => {
    // given the modal is saving
    fixture.componentRef.setInput("isSaving", true);

    // when the view is rendered
    fixture.detectChanges();

    // then saving feedback is visible
    expect(fixture.nativeElement.textContent).toContain("Saving...");
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
