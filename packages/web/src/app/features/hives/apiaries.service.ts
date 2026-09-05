import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";

import type { CreateApiaryRequest } from "@appiary/types";

import { ApiariesApi } from "./apiaries.api";
import { mapToApiaryViewModel, type ApiaryViewModel } from "./apiaries.mapper";

@Injectable({ providedIn: "root" })
export class ApiariesService {
  private readonly apiariesApi = inject(ApiariesApi);

  async listApiaries(): Promise<ApiaryViewModel[]> {
    const response = await firstValueFrom(this.apiariesApi.listApiaries());
    return response.apiaries.map(mapToApiaryViewModel);
  }

  async createApiary(payload: CreateApiaryRequest): Promise<ApiaryViewModel> {
    const response = await firstValueFrom(this.apiariesApi.createApiary(payload));
    return mapToApiaryViewModel(response.apiary);
  }
}
