import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { ApiariesApi } from "./apiaries.api";

describe("ApiariesApi", () => {
  let api: ApiariesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), ApiariesApi],
    });
    api = TestBed.inject(ApiariesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("lists apiaries with GET", () => {
    // given the apiary API is available
    // when the list is requested
    api.listApiaries().subscribe();

    // then it uses the apiary collection endpoint
    const request = http.expectOne("/api/apiaries");
    expect(request.request.method).toBe("GET");
    request.flush({ apiaries: [] });
  });

  it("creates an apiary with POST", () => {
    // given valid create details are available
    const payload = { name: "North Yard" };

    // when an apiary is created
    api.createApiary(payload).subscribe();

    // then the payload is posted unchanged
    const request = http.expectOne("/api/apiaries");
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual(payload);
    request.flush({ apiary: { apiaryId: "apiary-1", name: "North Yard", status: true } });
  });
});
