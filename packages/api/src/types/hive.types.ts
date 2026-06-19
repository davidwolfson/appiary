import type { HiveResponse } from "@appiary/types";

export interface CreateHiveAction {
  authenticatedUserId: string;
  name: string;
  status: boolean;
}

export interface CreateHiveResult {
  hive: HiveResponse;
}

export interface ListHivesResult {
  hives: HiveResponse[];
}
