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
    // given the API returns a hive-list response
    hivesApi.listHives.mockReturnValue(of({
      hives: [{ hiveId: "hive-1", name: "North Field", status: true }],
    }));

    // when the service lists hives
    const result = service.listHives();

    // then the mapped hive array is returned
    await expect(result).resolves.toEqual([
      { hiveId: "hive-1", name: "North Field", status: true },
    ]);
    expect(hivesApi.listHives).toHaveBeenCalled();
  });

  it("creates and maps a hive from the API", async () => {
    // given valid create details and an API hive response are available
    const payload: CreateHiveRequest = { name: "North Field", status: true };

    hivesApi.createHive.mockReturnValue(of({
      hive: { hiveId: "hive-1", name: "North Field", status: true },
    }));

    // when the service creates the hive
    const result = service.createHive(payload);

    // then the request is forwarded and the mapped hive is returned
    await expect(result).resolves.toEqual({
      hiveId: "hive-1",
      name: "North Field",
      status: true,
    });
    expect(hivesApi.createHive).toHaveBeenCalledWith(payload);
  });
});
