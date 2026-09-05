export interface ApiaryResponse {
  apiaryId: string;
  name: string;
  status: boolean;
}

export interface CreateApiaryRequest {
  name: string;
}

export interface CreateApiaryResponse {
  apiary: ApiaryResponse;
}

export interface ListApiariesResponse {
  apiaries: ApiaryResponse[];
}
