export type BroodPattern = "good" | "fair" | "poor" | "na";

export interface HiveInspectionResponse {
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

export interface CreateHiveInspectionRequest {
  inspectionDate: string;
  inspectionTime: string;
  queenRight: boolean;
  eggs: boolean;
  larva: boolean;
  cappedBrood: boolean;
  broodPattern?: BroodPattern | null;
  additionalNotes?: string | null;
}

export interface CreateHiveInspectionResponse {
  inspection: HiveInspectionResponse;
}

export interface HiveResponse {
  hiveId: string;
  name: string;
  status: boolean;
  inspections: HiveInspectionResponse[];
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
