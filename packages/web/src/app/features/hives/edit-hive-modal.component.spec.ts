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
    expect(fixture.nativeElement.textContent).toContain("Hive Name");
    expect(fixture.nativeElement.textContent).toContain("Status");
  });

  it("emits close without saving", () => {
    const closed = vi.fn();
    component.closed.subscribe(closed);

    component.close();

    expect(closed).toHaveBeenCalled();
  });

  it("blocks empty name submission", () => {
    const save = vi.fn();
    component.save.subscribe(save);

    component.submit();

    expect(save).not.toHaveBeenCalled();
  });

  it("blocks over-100-character name submission", () => {
    const save = vi.fn();
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue("a".repeat(101));

    component.submit();

    expect(save).not.toHaveBeenCalled();
  });

  it("emits trimmed name and status on valid submit", () => {
    const save = vi.fn();
    component.save.subscribe(save);
    componentApi.form.controls.name.setValue("  North Field  ");
    componentApi.form.controls.status.setValue(false);

    component.submit();

    expect(save).toHaveBeenCalledWith({
      name: "North Field",
      status: false,
    });
  });

  it("shows saving state and create error feedback", () => {
    fixture.componentRef.setInput("isSaving", true);
    fixture.componentRef.setInput("error", "Hive name already exists");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Saving...");
    expect(fixture.nativeElement.textContent).toContain("Hive name already exists");
  });
});
