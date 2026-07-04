import { beforeEach, describe, expect, it, vi } from "vitest";

import { HiveService } from "../../../src/services/hive.service.js";
import { DuplicateHiveNameError } from "../../../src/repositories/hive.repository.js";
import { AppError } from "../../../src/utils/app-error.js";

describe("HiveService", () => {
  const hiveRepository = {
    create: vi.fn(),
    findByAccountId: vi.fn(),
  };
  const userRepository = {
    findById: vi.fn(),
  };

  beforeEach(() => {
    hiveRepository.create.mockReset();
    hiveRepository.findByAccountId.mockReset();
    userRepository.findById.mockReset();
  });

  function createService() {
    return new HiveService(hiveRepository as never, userRepository as never);
  }

  it("lists hives for the authenticated user's account", async () => {
    // given the authenticated user belongs to an account with hives
    const service = createService();

    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    hiveRepository.findByAccountId.mockResolvedValue([
      {
        hiveId: "hive-1",
        accountId: "account-1",
        name: "North Field",
        status: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // when the user's hives are requested
    const result = service.listForAuthenticatedUser("user-1");

    // then the repository is scoped to the account and the hives are returned
    await expect(result).resolves.toEqual({
      hives: [
        {
          hiveId: "hive-1",
          name: "North Field",
          status: true,
        },
      ],
    });
    expect(hiveRepository.findByAccountId).toHaveBeenCalledWith("account-1");
  });

  it("creates a hive for the authenticated user's account", async () => {
    // given the authenticated user belongs to an account
    const service = createService();

    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    hiveRepository.create.mockResolvedValue({
      hiveId: "hive-1",
      accountId: "account-1",
      name: "North Field",
      status: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // when the user creates a hive
    const result = service.createForAuthenticatedUser({
      authenticatedUserId: "user-1",
      name: "  North Field  ",
      status: true,
    });

    // then the repository receives the account data and the hive is returned
    await expect(result).resolves.toEqual({
      hive: {
        hiveId: "hive-1",
        name: "North Field",
        status: true,
      },
    });
    expect(hiveRepository.create).toHaveBeenCalledWith({
      accountId: "account-1",
      name: "North Field",
      status: true,
    });
  });

  it("maps duplicate hive name repository errors to conflict errors", async () => {
    // given the repository rejects a duplicate hive name
    const service = createService();

    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    hiveRepository.create.mockRejectedValue(new DuplicateHiveNameError());

    // when the user creates the hive
    const result = service.createForAuthenticatedUser({
      authenticatedUserId: "user-1",
      name: "North Field",
      status: true,
    });

    // then the service returns a domain conflict
    await expect(result).rejects.toEqual(new AppError(409, "Hive name already exists"));
  });

  it("rejects hive listing when the authenticated user cannot be resolved", async () => {
    // given the authenticated user cannot be loaded
    const service = createService();
    userRepository.findById.mockResolvedValue(null);

    // when the user's hives are requested
    const result = service.listForAuthenticatedUser("missing-user");

    // then the service rejects the request as unauthorized
    await expect(result).rejects.toEqual(new AppError(401, "Unauthorized"));
  });

  it("rejects hive creation when the authenticated user cannot be resolved", async () => {
    // given the authenticated user cannot be loaded
    const service = createService();
    userRepository.findById.mockResolvedValue(null);

    // when the user creates a hive
    const result = service.createForAuthenticatedUser({
      authenticatedUserId: "missing-user",
      name: "North Field",
      status: true,
    });

    // then the service rejects the request as unauthorized
    await expect(result).rejects.toEqual(new AppError(401, "Unauthorized"));
  });
});
