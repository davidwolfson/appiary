import type { ApiaryModel } from "../models/apiary.model.js";
import { ApiaryRepository, DuplicateApiaryNameError } from "../repositories/apiary.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import type {
  ApiaryResult,
  CreateApiaryAction,
  CreateApiaryResult,
  ListApiariesResult,
} from "../types/apiary.types.js";
import { AppError } from "../utils/app-error.js";

export class ApiaryService {
  constructor(
    private readonly apiaryRepository: ApiaryRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async listForAuthenticatedUser(authenticatedUserId: string): Promise<ListApiariesResult> {
    const accountId = await this.getAuthenticatedAccountId(authenticatedUserId);
    const apiaries = await this.apiaryRepository.findByAccountId(accountId);

    return { apiaries: apiaries.map((apiary) => this.mapApiaryResult(apiary)) };
  }

  async createForAuthenticatedUser(action: CreateApiaryAction): Promise<CreateApiaryResult> {
    const accountId = await this.getAuthenticatedAccountId(action.authenticatedUserId);
    let apiary: ApiaryModel;

    try {
      apiary = await this.apiaryRepository.create({
        accountId,
        name: action.name.trim(),
      });
    } catch (error) {
      if (error instanceof DuplicateApiaryNameError) {
        throw new AppError(409, "Apiary name already exists");
      }

      throw error;
    }

    return { apiary: this.mapApiaryResult(apiary) };
  }

  private async getAuthenticatedAccountId(authenticatedUserId: string): Promise<string> {
    const user = await this.userRepository.findById(authenticatedUserId);

    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    return user.accountId;
  }

  private mapApiaryResult(apiary: ApiaryModel): ApiaryResult {
    return {
      apiaryId: apiary.apiaryId,
      name: apiary.name,
      status: apiary.status,
    };
  }
}
