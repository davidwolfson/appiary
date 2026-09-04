import type { ApiaryResponse } from "@appiary/types";

import type { ApiaryResult } from "../types/apiary.types.js";

export function mapToApiaryResponse(result: ApiaryResult): ApiaryResponse {
  return {
    apiaryId: result.apiaryId,
    name: result.name,
    status: result.status,
  };
}
