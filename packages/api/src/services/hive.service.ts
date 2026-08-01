import type { HiveModel } from "../models/hive.model.js";
import type { HiveInspectionModel } from "../models/hive-inspection.model.js";
import { HiveInspectionRepository } from "../repositories/hive-inspection.repository.js";
import { DuplicateHiveNameError, HiveRepository } from "../repositories/hive.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import type {
  CreateHiveAction,
  CreateHiveInspectionAction,
  CreateHiveInspectionResult,
  CreateHiveResult,
  HiveResult,
  HiveInspectionResult,
  ListHivesResult,
  UpdateHiveAction,
  UpdateHiveResult,
} from "../types/hive.types.js";
import { AppError } from "../utils/app-error.js";

export class HiveService {
  constructor(
    private readonly hiveRepository: HiveRepository,
    private readonly userRepository: UserRepository,
    private readonly hiveInspectionRepository: HiveInspectionRepository,
  ) {}

  async listForAuthenticatedUser(authenticatedUserId: string): Promise<ListHivesResult> {
    const accountId = await this.getAuthenticatedAccountId(authenticatedUserId);
    const hives = await this.hiveRepository.findByAccountId(accountId);
    const inspectionsByHiveId = await this.hiveInspectionRepository.findLatestForHiveIds(
      hives.map((hive) => hive.hiveId),
    );

    return {
      hives: hives.map((hive) => this.mapHiveResult(hive, inspectionsByHiveId.get(hive.hiveId) ?? [])),
    };
  }

  async createForAuthenticatedUser(action: CreateHiveAction): Promise<CreateHiveResult> {
    const accountId = await this.getAuthenticatedAccountId(action.authenticatedUserId);
    let hive: HiveModel;

    try {
      hive = await this.hiveRepository.create({
        accountId,
        name: action.name.trim(),
        status: action.status,
      });
    } catch (error) {
      if (error instanceof DuplicateHiveNameError) {
        throw new AppError(409, "Hive name already exists");
      }

      throw error;
    }

    return {
      hive: this.mapHiveResult(hive, []),
    };
  }

  async updateForAuthenticatedUser(action: UpdateHiveAction): Promise<UpdateHiveResult> {
    const accountId = await this.getAuthenticatedAccountId(action.authenticatedUserId);
    let hive: HiveModel | null;

    try {
      hive = await this.hiveRepository.update({
        accountId,
        hiveId: action.hiveId,
        name: action.name.trim(),
        status: action.status,
      });
    } catch (error) {
      if (error instanceof DuplicateHiveNameError) {
        throw new AppError(409, "Hive name already exists");
      }

      throw error;
    }

    if (!hive) {
      throw new AppError(404, "Hive not found");
    }

    const inspectionsByHiveId = await this.hiveInspectionRepository.findLatestForHiveIds([hive.hiveId]);

    return {
      hive: this.mapHiveResult(hive, inspectionsByHiveId.get(hive.hiveId) ?? []),
    };
  }

  async createInspectionForAuthenticatedUser(
    action: CreateHiveInspectionAction,
  ): Promise<CreateHiveInspectionResult> {
    const accountId = await this.getAuthenticatedAccountId(action.authenticatedUserId);
    const inspection = await this.hiveInspectionRepository.createForAccount({
      accountId,
      hiveId: action.hiveId,
      inspectionDate: action.inspectionDate,
      inspectionTime: action.inspectionTime,
      queenRight: action.queenRight,
      eggs: action.eggs,
      larva: action.larva,
      cappedBrood: action.cappedBrood,
      broodPattern: action.broodPattern,
      additionalNotes: action.additionalNotes,
    });

    if (!inspection) {
      throw new AppError(404, "Hive not found");
    }

    return { inspection: this.mapInspectionResult(inspection) };
  }

  private async getAuthenticatedAccountId(authenticatedUserId: string): Promise<string> {
    const user = await this.userRepository.findById(authenticatedUserId);

    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    return user.accountId;
  }

  private mapHiveResult(hive: HiveModel, inspections: HiveInspectionModel[]): HiveResult {
    return {
      hiveId: hive.hiveId,
      name: hive.name,
      status: hive.status,
      inspections: inspections.map((inspection) => this.mapInspectionResult(inspection)),
    };
  }

  private mapInspectionResult(inspection: HiveInspectionModel): HiveInspectionResult {
    return {
      inspectionId: inspection.inspectionId,
      hiveId: inspection.hiveId,
      inspectionDate: inspection.inspectionDate,
      inspectionTime: inspection.inspectionTime,
      queenRight: inspection.queenRight,
      eggs: inspection.eggs,
      larva: inspection.larva,
      cappedBrood: inspection.cappedBrood,
      broodPattern: inspection.broodPattern,
      additionalNotes: inspection.additionalNotes,
    };
  }
}
