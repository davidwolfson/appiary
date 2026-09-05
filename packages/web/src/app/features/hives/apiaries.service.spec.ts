import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { vi } from "vitest";

import { ApiariesApi } from "./apiaries.api";
import { ApiariesService } from "./apiaries.service";

describe("ApiariesService", () => {
  let service: ApiariesService;
  let api: { listApiaries: ReturnType<typeof vi.fn>; createApiary: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { listApiaries: vi.fn(), createApiary: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ApiariesService, { provide: ApiariesApi, useValue: api }],
    });
    service = TestBed.inject(ApiariesService);
  });

  it("lists mapped apiaries", async () => {
    // given the API returns an apiary
    api.listApiaries.mockReturnValue(of({ apiaries: [{ apiaryId: "apiary-1", name: "North", status: true }] }));

    // when apiaries are listed
    const result = service.listApiaries();

    // then mapped apiaries are returned
    await expect(result).resolves.toEqual([{ apiaryId: "apiary-1", name: "North", status: true }]);
  });

  it("creates a mapped apiary", async () => {
    // given the API accepts a create request
    api.createApiary.mockReturnValue(of({ apiary: { apiaryId: "apiary-1", name: "North", status: true } }));

    // when an apiary is created
    const result = service.createApiary({ name: "North" });

    // then the payload is delegated and the mapped apiary is returned
    await expect(result).resolves.toEqual({ apiaryId: "apiary-1", name: "North", status: true });
    expect(api.createApiary).toHaveBeenCalledWith({ name: "North" });
  });

  it("propagates list failures", async () => {
    // given the API rejects the list request
    const error = new Error("failed");
    api.listApiaries.mockReturnValue(throwError(() => error));

    // when apiaries are listed
    const result = service.listApiaries();

    // then the original failure reaches the caller
    await expect(result).rejects.toBe(error);
  });
});
