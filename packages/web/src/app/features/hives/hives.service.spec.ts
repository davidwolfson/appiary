import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { vi } from "vitest";

import type { CreateHiveInspectionRequest, CreateHiveRequest, UpdateHiveRequest } from "@appiary/types";

import { HivesApi } from "./hives.api";
import { HivesService } from "./hives.service";

describe("HivesService", () => {
  let service: HivesService;
  let hivesApi: {
    createHive: ReturnType<typeof vi.fn>;
    listInspections: ReturnType<typeof vi.fn>;
    listHives: ReturnType<typeof vi.fn>;
    updateHive: ReturnType<typeof vi.fn>;
    createInspection: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    hivesApi = {
      createHive: vi.fn(),
      listInspections: vi.fn(),
      listHives: vi.fn(),
      updateHive: vi.fn(),
      createInspection: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        HivesService,
        { provide: HivesApi, useValue: hivesApi },
      ],
    });

    service = TestBed.inject(HivesService);
  });

  it("lists mapped hives from the API", async () => {
    // given the API returns a hive-list response
    hivesApi.listHives.mockReturnValue(of({
      hives: [{ hiveId: "hive-1", apiaryId: "apiary-1", name: "North Field", status: true }],
    }));

    // when the service lists hives
    const result = service.listHives("apiary-1");

    // then the mapped hive array is returned
    await expect(result).resolves.toEqual([
      { hiveId: "hive-1", apiaryId: "apiary-1", name: "North Field", status: true, inspections: [] },
    ]);
    expect(hivesApi.listHives).toHaveBeenCalledWith("apiary-1");
  });

  it("creates and maps a hive from the API", async () => {
    // given valid create details and an API hive response are available
    const payload: CreateHiveRequest = { apiaryId: "apiary-1", name: "North Field", status: true };

    hivesApi.createHive.mockReturnValue(of({
      hive: { hiveId: "hive-1", apiaryId: "apiary-1", name: "North Field", status: true },
    }));

    // when the service creates the hive
    const result = service.createHive(payload);

    // then the request is forwarded and the mapped hive is returned
    await expect(result).resolves.toEqual({
      hiveId: "hive-1",
      apiaryId: "apiary-1",
      name: "North Field",
      status: true,
      inspections: [],
    });
    expect(hivesApi.createHive).toHaveBeenCalledWith(payload);
  });

  it("updates and maps a hive from the API", async () => {
    // given valid update details and an API hive response are available
    const payload: UpdateHiveRequest = { apiaryId: "apiary-1", name: "North Field", status: false };

    hivesApi.updateHive.mockReturnValue(of({
      hive: { hiveId: "hive-1", apiaryId: "apiary-1", name: "North Field", status: false },
    }));

    // when the service updates the hive
    const result = service.updateHive("hive-1", payload);

    // then the request is forwarded and the mapped hive is returned
    await expect(result).resolves.toEqual({
      hiveId: "hive-1",
      apiaryId: "apiary-1",
      name: "North Field",
      status: false,
      inspections: [],
    });
    expect(hivesApi.updateHive).toHaveBeenCalledWith("hive-1", payload);
  });

  it("creates and maps an inspection from the API", async () => {
    // given inspection details and an API response with nullable values
    const payload: CreateHiveInspectionRequest = { inspectionDate: "2026-07-31", inspectionTime: "10:30", queenRight: true, eggs: false, larva: true, cappedBrood: false, broodPattern: null, additionalNotes: null };
    const inspection = { inspectionId: "inspection-1", hiveId: "hive-1", ...payload, broodPattern: null, additionalNotes: null };
    hivesApi.createInspection.mockReturnValue(of({ inspection }));

    // when the service creates the inspection
    const result = service.createInspection("hive-1", payload);

    // then delegation and mapped output preserve the contract
    await expect(result).resolves.toEqual(inspection);
    expect(hivesApi.createInspection).toHaveBeenCalledWith("hive-1", payload);
  });

  it("propagates inspection creation failures", async () => {
    // given the inspection API rejects
    const error = new Error("Could not save inspection");
    hivesApi.createInspection.mockReturnValue(throwError(() => error));

    // when the service creates an inspection
    const result = service.createInspection("hive-1", { inspectionDate: "2026-07-31", inspectionTime: "10:30", queenRight: true, eggs: true, larva: true, cappedBrood: true });

    // then the original failure reaches the caller
    await expect(result).rejects.toBe(error);
  });

  it("lists mapped inspections with pagination metadata", async () => {
    // given the API returns a second inspection page
    const inspection = {
      inspectionId: "inspection-6", hiveId: "hive-1", inspectionDate: "2026-07-25",
      inspectionTime: "09:15", queenRight: false, eggs: false, larva: false,
      cappedBrood: false, broodPattern: null, additionalNotes: null,
    };
    const pagination = { page: 2, pageSize: 5, totalItems: 6, totalPages: 2 };
    hivesApi.listInspections.mockReturnValue(of({ inspections: [inspection], pagination }));

    // when the service lists page two
    const result = service.listInspections("hive-1", 2);

    // then delegation, inspection mapping, and pagination preserve the API contract
    await expect(result).resolves.toEqual({ inspections: [inspection], pagination });
    expect(hivesApi.listInspections).toHaveBeenCalledWith("hive-1", 2);
  });

  it("propagates inspection page failures", async () => {
    // given the inspection page API rejects
    const error = new Error("Could not load inspections");
    hivesApi.listInspections.mockReturnValue(throwError(() => error));

    // when the service lists an inspection page
    const result = service.listInspections("hive-1", 2);

    // then the original failure reaches the caller
    await expect(result).rejects.toBe(error);
  });
});
