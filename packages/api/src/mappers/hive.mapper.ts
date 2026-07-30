import type { HiveResponse } from "@appiary/types";

import type { HiveResult } from "../types/hive.types.js";

export function mapToHiveResponse(result: HiveResult): HiveResponse {
  return {
    hiveId: result.hiveId,
    name: result.name,
    status: result.status,
  };
}
