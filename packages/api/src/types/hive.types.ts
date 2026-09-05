import type { BroodPattern } from "@appiary/types";

export interface HiveInspectionResult {
  inspectionId: string;
  hiveId: string;
  inspectionDate: string;
  inspectionTime: string;
  queenRight: boolean;
  eggs: boolean;
  larva: boolean;
  cappedBrood: boolean;
  broodPattern: BroodPattern | null;
  additionalNotes: string | null;
}

export interface CreateHiveAction {
  authenticatedUserId: string;
  apiaryId: string;
  name: string;
  status: boolean;
}

export interface HiveResult {
  hiveId: string;
  apiaryId: string;
  name: string;
  status: boolean;
  inspections: HiveInspectionResult[];
  inspectionPagination: InspectionPaginationResult;
}

export interface InspectionPaginationResult {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ListHiveInspectionsResult {
  inspections: HiveInspectionResult[];
  pagination: InspectionPaginationResult;
}

export interface CreateHiveInspectionAction {
  authenticatedUserId: string;
  hiveId: string;
  inspectionDate: string;
  inspectionTime: string;
  queenRight: boolean;
  eggs: boolean;
  larva: boolean;
  cappedBrood: boolean;
  broodPattern: BroodPattern | null;
  additionalNotes: string | null;
}

export interface CreateHiveInspectionResult {
  inspection: HiveInspectionResult;
}

export interface CreateHiveResult {
  hive: HiveResult;
}

export interface UpdateHiveAction {
  authenticatedUserId: string;
  hiveId: string;
  apiaryId: string;
  name: string;
  status: boolean;
}

export interface UpdateHiveResult {
  hive: HiveResult;
}

export interface ListHivesResult {
  hives: HiveResult[];
}
