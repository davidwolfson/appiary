import bcrypt from "bcryptjs";

import type { AuthenticatedUser } from "@appiary/types";

import { AccountRepository } from "../repositories/account.repository.js";
import { RevokedTokenRepository } from "../repositories/revoked-token.repository.js";
import { DuplicateUserEmailError, UserRepository } from "../repositories/user.repository.js";
import type { AuthResult, LoginAction, LogoutAction, RegisterAction } from "../types/auth.types.js";
import { AppError } from "../utils/app-error.js";
import { database } from "../utils/database.js";
import { signAuthToken } from "../utils/jwt.js";

export class AuthService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly userRepository: UserRepository,
    private readonly revokedTokenRepository: RevokedTokenRepository,
  ) {}

  async register(action: RegisterAction): Promise<AuthResult> {
    const normalizedEmail = action.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError(409, "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(action.password, 10);

    let user;
    try {
      user = await database.withTransaction(async (client) => {
        const account = await this.accountRepository.create(action.accountName.trim(), client);

        return this.userRepository.create(
          {
            accountId: account.id,
            email: normalizedEmail,
            passwordHash,
          },
          client,
        );
      });
    } catch (error) {
      if (error instanceof DuplicateUserEmailError) {
        throw new AppError(409, "Email is already registered");
      }

      throw error;
    }

    const fullUser = await this.userRepository.findById(user.id);

    if (!fullUser) {
      throw new AppError(500, "Failed to load registered user");
    }

    return this.buildAuthResult(fullUser.id, this.mapAuthenticatedUser(fullUser));
  }

  async login(action: LoginAction): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(action.email.trim().toLowerCase());

    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(action.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password");
    }

    return this.buildAuthResult(user.id, this.mapAuthenticatedUser(user));
  }

  async logout(action: LogoutAction): Promise<void> {
    await this.revokedTokenRepository.create(action);
  }

  async getAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    return this.mapAuthenticatedUser(user);
  }

  private buildAuthResult(userId: string, user: AuthenticatedUser): AuthResult {
    return {
      user,
      token: signAuthToken(userId),
    };
  }

  private mapAuthenticatedUser(user: {
    id: string;
    email: string;
    accountId: string;
    accountName: string;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      accountId: user.accountId,
      accountName: user.accountName,
    };
  }
}

