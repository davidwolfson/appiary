export interface CreateApiaryAction {
  authenticatedUserId: string;
  name: string;
}

export interface ApiaryResult {
  apiaryId: string;
  name: string;
  status: boolean;
}

export interface CreateApiaryResult {
  apiary: ApiaryResult;
}

export interface ListApiariesResult {
  apiaries: ApiaryResult[];
}
