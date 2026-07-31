import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { HivesApi } from "./hives.api";

describe("HivesApi", () => {
  let api: HivesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        HivesApi,
      ],
    });

    api = TestBed.inject(HivesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it("updates a hive with PUT", () => {
    // given valid update details are available
    const payload = { name: "North Field", status: false };

    // when the API updates a hive
    api.updateHive("hive-1", payload).subscribe();

    // then the request uses the scoped update endpoint and payload
    const request = http.expectOne("/api/hives/hive-1");
    expect(request.request.method).toBe("PUT");
    expect(request.request.body).toEqual(payload);

    request.flush({
      hive: { hiveId: "hive-1", name: "North Field", status: false },
    });
  });

  it("creates an inspection at the nested endpoint", () => {
    // given valid inspection details are available
    const payload = { inspectionDate: "2026-07-31", inspectionTime: "15:30", queenRight: true, eggs: true, larva: false, cappedBrood: false, broodPattern: null, additionalNotes: null };

    // when the API creates the inspection
    api.createInspection("hive-1", payload).subscribe();

    // then the request uses the hive-scoped endpoint and unchanged payload
    const request = http.expectOne("/api/hives/hive-1/inspections");
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual(payload);
    request.flush({ inspection: { inspectionId: "inspection-1", hiveId: "hive-1", ...payload } });
  });
});
