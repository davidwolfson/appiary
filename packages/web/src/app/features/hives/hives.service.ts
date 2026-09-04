import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";

import type { CreateHiveInspectionRequest, CreateHiveRequest, UpdateHiveRequest } from "@appiary/types";

import { HivesApi } from "./hives.api";
import {
  mapToHiveInspectionViewModel,
  mapToHiveViewModel,
  type HiveInspectionViewModel,
  type HiveViewModel,
} from "./hives.mapper";

@Injectable({ providedIn: "root" })
export class HivesService {
  private readonly hivesApi = inject(HivesApi);

  async listHives(apiaryId: string): Promise<HiveViewModel[]> {
    const response = await firstValueFrom(this.hivesApi.listHives(apiaryId));

    return response.hives.map(mapToHiveViewModel);
  }

  async createHive(payload: CreateHiveRequest): Promise<HiveViewModel> {
    const response = await firstValueFrom(this.hivesApi.createHive(payload));

    return mapToHiveViewModel(response.hive);
  }

  async listInspections(hiveId: string, page: number) {
    const response = await firstValueFrom(this.hivesApi.listInspections(hiveId, page));
    return {
      inspections: response.inspections.map(mapToHiveInspectionViewModel),
      pagination: response.pagination,
    };
  }

  async updateHive(hiveId: string, payload: UpdateHiveRequest): Promise<HiveViewModel> {
    const response = await firstValueFrom(this.hivesApi.updateHive(hiveId, payload));

    return mapToHiveViewModel(response.hive);
  }

  async createInspection(
    hiveId: string,
    payload: CreateHiveInspectionRequest,
  ): Promise<HiveInspectionViewModel> {
    const response = await firstValueFrom(this.hivesApi.createInspection(hiveId, payload));

    return mapToHiveInspectionViewModel(response.inspection);
  }
}
