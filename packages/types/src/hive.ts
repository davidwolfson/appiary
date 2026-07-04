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

export interface ListHivesResponse {
  hives: HiveResponse[];
}
