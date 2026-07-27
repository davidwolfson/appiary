import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";

import type { CreateHiveRequest, UpdateHiveRequest } from "@appiary/types";

import { HivesApi } from "./hives.api";
import { mapToHiveViewModel, type HiveViewModel } from "./hives.mapper";

@Injectable({ providedIn: "root" })
export class HivesService {
  private readonly hivesApi = inject(HivesApi);

  async listHives(): Promise<HiveViewModel[]> {
    const response = await firstValueFrom(this.hivesApi.listHives());

    return response.hives.map(mapToHiveViewModel);
  }

  async createHive(payload: CreateHiveRequest): Promise<HiveViewModel> {
    const response = await firstValueFrom(this.hivesApi.createHive(payload));

    return mapToHiveViewModel(response.hive);
  }

  async updateHive(hiveId: string, payload: UpdateHiveRequest): Promise<HiveViewModel> {
    const response = await firstValueFrom(this.hivesApi.updateHive(hiveId, payload));

    return mapToHiveViewModel(response.hive);
  }
}
