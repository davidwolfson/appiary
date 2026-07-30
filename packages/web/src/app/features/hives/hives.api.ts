import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

import type {
  CreateHiveRequest,
  CreateHiveResponse,
  ListHivesResponse,
  UpdateHiveRequest,
  UpdateHiveResponse,
} from "@appiary/types";

import { apiConfig } from "../../core/api/api.config";

@Injectable({ providedIn: "root" })
export class HivesApi {
  private readonly http = inject(HttpClient);
  private readonly hivesUrl = `${apiConfig.baseUrl}/hives`;

  listHives() {
    return this.http.get<ListHivesResponse>(this.hivesUrl);
  }

  createHive(payload: CreateHiveRequest) {
    return this.http.post<CreateHiveResponse>(this.hivesUrl, payload);
  }

  updateHive(hiveId: string, payload: UpdateHiveRequest) {
    return this.http.put<UpdateHiveResponse>(`${this.hivesUrl}/${hiveId}`, payload);
  }
}
