import type { HiveResponse } from "@appiary/types";

export type HiveViewModel = HiveResponse;

export function mapToHiveViewModel(hive: HiveResponse): HiveViewModel {
  return {
    hiveId: hive.hiveId,
    name: hive.name,
    status: hive.status,
  };
}
