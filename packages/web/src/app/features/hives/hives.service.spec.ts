import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { vi } from "vitest";

import type { CreateHiveRequest } from "@appiary/types";

import { HivesApi } from "./hives.api";
import { HivesService } from "./hives.service";

describe("HivesService", () => {
  let service: HivesService;
  let hivesApi: {
    createHive: ReturnType<typeof vi.fn>;
    listHives: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    hivesApi = {
      createHive: vi.fn(),
      listHives: vi.fn(),
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
    hivesApi.listHives.mockReturnValue(of({
      hives: [{ hiveId: "hive-1", name: "North Field", status: true }],
    }));

    await expect(service.listHives()).resolves.toEqual([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    expect(hivesApi.listHives).toHaveBeenCalled();
  });

  it("creates and maps a hive from the API", async () => {
    const payload: CreateHiveRequest = { name: "North Field", status: true };

    hivesApi.createHive.mockReturnValue(of({
      hive: { hiveId: "hive-1", name: "North Field", status: true },
    }));

    await expect(service.createHive(payload)).resolves.toEqual({
      hiveId: "hive-1",
      name: "North Field",
      status: true,
    });
    expect(hivesApi.createHive).toHaveBeenCalledWith(payload);
  });
});
