import type { BroodPattern } from "@appiary/types";

import type { HiveInspectionModel } from "../models/hive-inspection.model.js";
import { database } from "../utils/database.js";

interface HiveInspectionRow {
  inspection_id: string;
  hive_id: string;
  inspection_date: string;
  inspection_time: string;
  queen_right: boolean;
  eggs: boolean;
  larva: boolean;
  capped_brood: boolean;
  brood_pattern: BroodPattern | null;
  additional_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHiveInspectionInput {
  accountId: string;
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

export class HiveInspectionRepository {
  async createForAccount(input: CreateHiveInspectionInput): Promise<HiveInspectionModel | null> {
    const result = await database.query<HiveInspectionRow>(
      `INSERT INTO hive_inspections (
         hive_id, inspection_date, inspection_time, queen_right, eggs, larva, capped_brood,
         brood_pattern, additional_notes
       )
       SELECT h.hive_id, $3::date, $4::time, $5, $6, $7, $8, $9, $10
       FROM hives h
       WHERE h.account_id = $1 AND h.hive_id = $2
       RETURNING inspection_id, hive_id, inspection_date::text, inspection_time::text,
         queen_right, eggs, larva, capped_brood, brood_pattern, additional_notes, created_at, updated_at`,
      [input.accountId, input.hiveId, input.inspectionDate, input.inspectionTime, input.queenRight,
        input.eggs, input.larva, input.cappedBrood, input.broodPattern, input.additionalNotes],
    );

    return result.rows[0] ? this.mapInspection(result.rows[0]) : null;
  }

  async findLatestForHiveIds(hiveIds: string[]): Promise<Map<string, HiveInspectionModel[]>> {
    const inspectionsByHiveId = new Map<string, HiveInspectionModel[]>(
      hiveIds.map((hiveId) => [hiveId, []]),
    );

    if (hiveIds.length === 0) {
      return inspectionsByHiveId;
    }

    const result = await database.query<HiveInspectionRow>(
      `SELECT inspection_id, hive_id, inspection_date::text, inspection_time::text,
         queen_right, eggs, larva, capped_brood, brood_pattern, additional_notes, created_at, updated_at
       FROM (
         SELECT hi.*, ROW_NUMBER() OVER (
           PARTITION BY hive_id
           ORDER BY inspection_date DESC, inspection_time DESC, created_at DESC, inspection_id DESC
         ) AS inspection_rank
         FROM hive_inspections hi
         WHERE hive_id = ANY($1::uuid[])
       ) ranked
       WHERE inspection_rank <= 5
       ORDER BY hive_id, inspection_date DESC, inspection_time DESC, created_at DESC, inspection_id DESC`,
      [hiveIds],
    );

    for (const row of result.rows) {
      inspectionsByHiveId.get(row.hive_id)?.push(this.mapInspection(row));
    }

    return inspectionsByHiveId;
  }

  private mapInspection(row: HiveInspectionRow): HiveInspectionModel {
    return {
      inspectionId: row.inspection_id,
      hiveId: row.hive_id,
      inspectionDate: row.inspection_date,
      inspectionTime: row.inspection_time.slice(0, 5),
      queenRight: row.queen_right,
      eggs: row.eggs,
      larva: row.larva,
      cappedBrood: row.capped_brood,
      broodPattern: row.brood_pattern,
      additionalNotes: row.additional_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
