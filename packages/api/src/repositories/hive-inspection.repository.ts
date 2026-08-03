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
  total_items?: string;
}

export interface HiveInspectionPage {
  inspections: HiveInspectionModel[];
  totalItems: number;
}

export const HIVE_INSPECTION_PAGE_SIZE = 5;

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

  async findFirstPageForHiveIds(hiveIds: string[]): Promise<Map<string, HiveInspectionPage>> {
    const pagesByHiveId = new Map<string, HiveInspectionPage>(
      hiveIds.map((hiveId) => [hiveId, { inspections: [], totalItems: 0 }]),
    );

    if (hiveIds.length === 0) {
      return pagesByHiveId;
    }

    const result = await database.query<HiveInspectionRow>(
      `SELECT inspection_id, hive_id, inspection_date::text, inspection_time::text,
         queen_right, eggs, larva, capped_brood, brood_pattern, additional_notes, created_at, updated_at,
         total_items::text
       FROM (
         SELECT hi.*, COUNT(*) OVER (PARTITION BY hive_id) AS total_items,
           ROW_NUMBER() OVER (PARTITION BY hive_id ORDER BY inspection_date DESC, inspection_time DESC, created_at DESC, inspection_id DESC) AS inspection_rank
         FROM hive_inspections hi
         WHERE hive_id = ANY($1::uuid[])
       ) ranked_inspections
       WHERE inspection_rank <= $2
       ORDER BY hive_id, inspection_rank`,
      [hiveIds, HIVE_INSPECTION_PAGE_SIZE],
    );

    for (const row of result.rows) {
      const page = pagesByHiveId.get(row.hive_id);
      if (page) {
        page.inspections.push(this.mapInspection(row));
        page.totalItems = Number(row.total_items ?? 0);
      }
    }

    return pagesByHiveId;
  }

  async findPageForAccount(input: { accountId: string; hiveId: string; page: number }): Promise<HiveInspectionPage | null> {
    const offset = (input.page - 1) * HIVE_INSPECTION_PAGE_SIZE;
    const countResult = await database.query<{ total_items: string }>(
      `SELECT COUNT(hi.inspection_id)::text AS total_items
       FROM hives h
       LEFT JOIN hive_inspections hi ON hi.hive_id = h.hive_id
       WHERE h.account_id = $1 AND h.hive_id = $2
       GROUP BY h.hive_id`,
      [input.accountId, input.hiveId],
    );
    const countRow = countResult.rows[0];
    if (!countRow) {
      return null;
    }

    const result = await database.query<HiveInspectionRow>(
      `SELECT hi.inspection_id, hi.hive_id, hi.inspection_date::text, hi.inspection_time::text,
         hi.queen_right, hi.eggs, hi.larva, hi.capped_brood, hi.brood_pattern, hi.additional_notes,
         hi.created_at, hi.updated_at
       FROM hive_inspections hi
       INNER JOIN hives h ON h.hive_id = hi.hive_id
       WHERE h.account_id = $1 AND hi.hive_id = $2
       ORDER BY hi.inspection_date DESC, hi.inspection_time DESC, hi.created_at DESC, hi.inspection_id DESC
       LIMIT $3 OFFSET $4`,
      [input.accountId, input.hiveId, HIVE_INSPECTION_PAGE_SIZE, offset],
    );

    return {
      inspections: result.rows.map((row) => this.mapInspection(row)),
      totalItems: Number(countRow.total_items),
    };
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
