import type { BroodPattern } from "@appiary/types";

export interface HiveInspectionModel {
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
  createdAt: Date;
  updatedAt: Date;
}
