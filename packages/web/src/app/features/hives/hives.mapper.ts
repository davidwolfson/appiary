import type { HiveInspectionResponse, HiveResponse } from "@appiary/types";

export type HiveInspectionViewModel = HiveInspectionResponse;
export type HiveViewModel = HiveResponse;

export function mapToHiveInspectionViewModel(inspection: HiveInspectionResponse): HiveInspectionViewModel {
  return { ...inspection };
}

export function mapToHiveViewModel(hive: HiveResponse): HiveViewModel {
  return {
    hiveId: hive.hiveId,
    name: hive.name,
    status: hive.status,
    inspections: (hive.inspections ?? []).map(mapToHiveInspectionViewModel),
  };
}
