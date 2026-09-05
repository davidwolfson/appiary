import type { HiveInspectionResponse, HiveResponse } from "@appiary/types";

import type { HiveInspectionResult, HiveResult } from "../types/hive.types.js";

export function mapToHiveInspectionResponse(result: HiveInspectionResult): HiveInspectionResponse {
  return { ...result };
}

export function mapToHiveResponse(result: HiveResult): HiveResponse {
  return {
    hiveId: result.hiveId,
    apiaryId: result.apiaryId,
    name: result.name,
    status: result.status,
    inspections: result.inspections.map(mapToHiveInspectionResponse),
    ...(result.inspectionPagination ? { inspectionPagination: { ...result.inspectionPagination } } : {}),
  };
}
