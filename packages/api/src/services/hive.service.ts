import type { HiveModel } from "../models/hive.model.js";
import type { HiveInspectionModel } from "../models/hive-inspection.model.js";
import { HIVE_INSPECTION_PAGE_SIZE, HiveInspectionRepository, type HiveInspectionPage } from "../repositories/hive-inspection.repository.js";
import { DuplicateHiveNameError, HiveRepository } from "../repositories/hive.repository.js";
import { ApiaryRepository } from "../repositories/apiary.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import type {
  CreateHiveAction,
  CreateHiveInspectionAction,
  CreateHiveInspectionResult,
  CreateHiveResult,
  HiveResult,
  HiveInspectionResult,
  ListHiveInspectionsResult,
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
    private readonly apiaryRepository: ApiaryRepository,
  ) {}

  async listForAuthenticatedUser(authenticatedUserId: string, apiaryId: string): Promise<ListHivesResult> {
    const accountId = await this.getAuthenticatedAccountId(authenticatedUserId);
    await this.requireOwnedApiary(accountId, apiaryId);
    const hives = await this.hiveRepository.findByAccountIdAndApiaryId(accountId, apiaryId);
    const inspectionsByHiveId = await this.hiveInspectionRepository.findFirstPageForHiveIds(
      hives.map((hive) => hive.hiveId),
    );

    return {
      hives: hives.map((hive) => this.mapHiveResult(hive, inspectionsByHiveId.get(hive.hiveId) ?? this.emptyInspectionPage())),
    };
  }

  async createForAuthenticatedUser(action: CreateHiveAction): Promise<CreateHiveResult> {
    const accountId = await this.getAuthenticatedAccountId(action.authenticatedUserId);
    await this.requireOwnedApiary(accountId, action.apiaryId);
    let hive: HiveModel;

    try {
      hive = await this.hiveRepository.create({
        accountId,
        apiaryId: action.apiaryId,
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
      hive: this.mapHiveResult(hive, this.emptyInspectionPage()),
    };
  }

  async updateForAuthenticatedUser(action: UpdateHiveAction): Promise<UpdateHiveResult> {
    const accountId = await this.getAuthenticatedAccountId(action.authenticatedUserId);
    await this.requireOwnedApiary(accountId, action.apiaryId);
    let hive: HiveModel | null;

    try {
      hive = await this.hiveRepository.update({
        accountId,
        hiveId: action.hiveId,
        apiaryId: action.apiaryId,
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

    const inspectionsByHiveId = await this.hiveInspectionRepository.findFirstPageForHiveIds([hive.hiveId]);

    return {
      hive: this.mapHiveResult(hive, inspectionsByHiveId.get(hive.hiveId) ?? this.emptyInspectionPage()),
    };
  }

  async listInspectionsForAuthenticatedUser(
    authenticatedUserId: string,
    hiveId: string,
    page: number,
  ): Promise<ListHiveInspectionsResult> {
    const accountId = await this.getAuthenticatedAccountId(authenticatedUserId);
    const inspectionPage = await this.hiveInspectionRepository.findPageForAccount({ accountId, hiveId, page });
    if (!inspectionPage) {
      throw new AppError(404, "Hive not found");
    }

    return {
      inspections: inspectionPage.inspections.map((inspection) => this.mapInspectionResult(inspection)),
      pagination: this.mapPagination(inspectionPage, page),
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

  private async requireOwnedApiary(accountId: string, apiaryId: string): Promise<void> {
    const apiary = await this.apiaryRepository.findByAccountIdAndApiaryId(accountId, apiaryId);
    if (!apiary) {
      throw new AppError(404, "Apiary not found");
    }
  }

  private mapHiveResult(hive: HiveModel, inspectionPage: HiveInspectionPage): HiveResult {
    return {
      hiveId: hive.hiveId,
      apiaryId: hive.apiaryId,
      name: hive.name,
      status: hive.status,
      inspections: inspectionPage.inspections.map((inspection) => this.mapInspectionResult(inspection)),
      inspectionPagination: this.mapPagination(inspectionPage, 1),
    };
  }

  private emptyInspectionPage(): HiveInspectionPage {
    return { inspections: [], totalItems: 0 };
  }

  private mapPagination(page: HiveInspectionPage, pageNumber: number) {
    return {
      page: pageNumber,
      pageSize: HIVE_INSPECTION_PAGE_SIZE,
      totalItems: page.totalItems,
      totalPages: Math.ceil(page.totalItems / HIVE_INSPECTION_PAGE_SIZE),
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
