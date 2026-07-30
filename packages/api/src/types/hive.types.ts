export interface CreateHiveAction {
  authenticatedUserId: string;
  name: string;
  status: boolean;
}

export interface HiveResult {
  hiveId: string;
  name: string;
  status: boolean;
}

export interface CreateHiveResult {
  hive: HiveResult;
}

export interface UpdateHiveAction {
  authenticatedUserId: string;
  hiveId: string;
  name: string;
  status: boolean;
}

export interface UpdateHiveResult {
  hive: HiveResult;
}

export interface ListHivesResult {
  hives: HiveResult[];
}
