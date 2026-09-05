import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

import type { CreateApiaryRequest, CreateApiaryResponse, ListApiariesResponse } from "@appiary/types";

import { apiConfig } from "../../core/api/api.config";

@Injectable({ providedIn: "root" })
export class ApiariesApi {
  private readonly http = inject(HttpClient);
  private readonly apiariesUrl = `${apiConfig.baseUrl}/apiaries`;

  listApiaries() {
    return this.http.get<ListApiariesResponse>(this.apiariesUrl);
  }

  createApiary(payload: CreateApiaryRequest) {
    return this.http.post<CreateApiaryResponse>(this.apiariesUrl, payload);
  }
}
