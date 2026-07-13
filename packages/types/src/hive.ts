export interface HiveResponse {
  hiveId: string;
  name: string;
  status: boolean;
}

export interface CreateHiveRequest {
  name: string;
  status: boolean;
}

export interface CreateHiveResponse {
  hive: HiveResponse;
}

export interface UpdateHiveRequest {
  name: string;
  status: boolean;
}

export interface UpdateHiveResponse {
  hive: HiveResponse;
}

export interface ListHivesResponse {
  hives: HiveResponse[];
}
