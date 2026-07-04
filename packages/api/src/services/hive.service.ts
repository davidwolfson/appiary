import type { HiveResponse } from "@appiary/types";

import type { HiveModel } from "../models/hive.model.js";
import { DuplicateHiveNameError, HiveRepository } from "../repositories/hive.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { CreateHiveAction, CreateHiveResult, ListHivesResult } from "../types/hive.types.js";
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
      hives: hives.map((hive) => this.mapHiveResponse(hive)),
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
      hive: this.mapHiveResponse(hive),
    };
  }

  private async getAuthenticatedAccountId(authenticatedUserId: string): Promise<string> {
    const user = await this.userRepository.findById(authenticatedUserId);

    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    return user.accountId;
  }

  private mapHiveResponse(hive: HiveModel): HiveResponse {
    return {
      hiveId: hive.hiveId,
      name: hive.name,
      status: hive.status,
    };
  }
}
