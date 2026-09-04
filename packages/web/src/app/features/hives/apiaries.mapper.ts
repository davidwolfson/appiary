import type { ApiaryResponse } from "@appiary/types";

export type ApiaryViewModel = ApiaryResponse;

export function mapToApiaryViewModel(apiary: ApiaryResponse): ApiaryViewModel {
  return {
    apiaryId: apiary.apiaryId,
    name: apiary.name,
    status: apiary.status,
  };
}
