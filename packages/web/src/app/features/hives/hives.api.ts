import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

import type {
  CreateHiveRequest,
  CreateHiveResponse,
  CreateHiveInspectionRequest,
  CreateHiveInspectionResponse,
  ListHivesResponse,
  ListHiveInspectionsResponse,
  UpdateHiveRequest,
  UpdateHiveResponse,
} from "@appiary/types";

import { apiConfig } from "../../core/api/api.config";

@Injectable({ providedIn: "root" })
export class HivesApi {
  private readonly http = inject(HttpClient);
  private readonly hivesUrl = `${apiConfig.baseUrl}/hives`;

  listHives(apiaryId: string) {
    return this.http.get<ListHivesResponse>(this.hivesUrl, { params: { apiaryId } });
  }

  listInspections(hiveId: string, page: number) {
    return this.http.get<ListHiveInspectionsResponse>(`${this.hivesUrl}/${hiveId}/inspections`, {
      params: { page },
    });
  }

  createHive(payload: CreateHiveRequest) {
    return this.http.post<CreateHiveResponse>(this.hivesUrl, payload);
  }

  updateHive(hiveId: string, payload: UpdateHiveRequest) {
    return this.http.put<UpdateHiveResponse>(`${this.hivesUrl}/${hiveId}`, payload);
  }

  createInspection(hiveId: string, payload: CreateHiveInspectionRequest) {
    return this.http.post<CreateHiveInspectionResponse>(`${this.hivesUrl}/${hiveId}/inspections`, payload);
  }
}
