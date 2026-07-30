import type { HiveModel } from "../models/hive.model.js";
import { DuplicateHiveNameError, HiveRepository } from "../repositories/hive.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import type {
  CreateHiveAction,
  CreateHiveResult,
  HiveResult,
  ListHivesResult,
  UpdateHiveAction,
  UpdateHiveResult,
} from "../types/hive.types.js";
import { AppError } from "../utils/app-error.js";

export class HiveService {
  constructor(
    private readonly hiveRepository: HiveRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async listForAuthenticatedUser(authenticatedUserId: string): Promise<ListHivesResult> {
    const accountId = await this.getAuthenticatedAccountId(authenticatedUserId);
    const hives = await this.hiveRepository.findByAccountId(accountId);

    return {
      hives: hives.map((hive) => this.mapHiveResult(hive)),
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
      hive: this.mapHiveResult(hive),
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

    return {
      hive: this.mapHiveResult(hive),
    };
  }

  private async getAuthenticatedAccountId(authenticatedUserId: string): Promise<string> {
    const user = await this.userRepository.findById(authenticatedUserId);

    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    return user.accountId;
  }

  private mapHiveResult(hive: HiveModel): HiveResult {
    return {
      hiveId: hive.hiveId,
      name: hive.name,
      status: hive.status,
    };
  }
}
