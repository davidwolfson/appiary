import { beforeEach, describe, expect, it, vi } from "vitest";

import { HiveService } from "../../../src/services/hive.service.js";
import { DuplicateHiveNameError } from "../../../src/repositories/hive.repository.js";
import { AppError } from "../../../src/utils/app-error.js";

describe("HiveService", () => {
  const hiveRepository = {
    create: vi.fn(),
    findByAccountId: vi.fn(),
    update: vi.fn(),
  };
  const userRepository = {
    findById: vi.fn(),
  };

  beforeEach(() => {
    hiveRepository.create.mockReset();
    hiveRepository.findByAccountId.mockReset();
    hiveRepository.update.mockReset();
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

  it("updates a hive to changed values for the authenticated user's account", async () => {
    // given the authenticated user belongs to an account with a hive currently named North Field and active
    const service = createService();
    const existingHive = {
      hiveId: "hive-1",
      accountId: "account-1",
      name: "North Field",
      status: true,
    };
    const updatePayload = {
      name: "South Field",
      status: false,
    };

    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: existingHive.accountId });
    hiveRepository.update.mockResolvedValue({
      hiveId: existingHive.hiveId,
      accountId: existingHive.accountId,
      name: updatePayload.name,
      status: updatePayload.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // when the user updates the hive
    const result = service.updateForAuthenticatedUser({
      authenticatedUserId: "user-1",
      hiveId: existingHive.hiveId,
      name: `  ${updatePayload.name}  `,
      status: updatePayload.status,
    });

    // then the repository receives changed, normalized values and the updated hive is returned
    await expect(result).resolves.toEqual({
      hive: {
        hiveId: existingHive.hiveId,
        name: updatePayload.name,
        status: updatePayload.status,
      },
    });
    expect(hiveRepository.update).toHaveBeenCalledWith({
      accountId: existingHive.accountId,
      hiveId: existingHive.hiveId,
      name: updatePayload.name,
      status: updatePayload.status,
    });
  });

  it("maps duplicate hive name update errors to conflict errors", async () => {
    // given the repository rejects a duplicate hive name during update
    const service = createService();

    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    hiveRepository.update.mockRejectedValue(new DuplicateHiveNameError());

    // when the user updates the hive
    const result = service.updateForAuthenticatedUser({
      authenticatedUserId: "user-1",
      hiveId: "hive-1",
      name: "South Field",
      status: true,
    });

    // then the service returns a domain conflict
    await expect(result).rejects.toEqual(new AppError(409, "Hive name already exists"));
  });

  it("maps missing hives to not found errors on update", async () => {
    // given the repository cannot find the scoped hive
    const service = createService();

    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    hiveRepository.update.mockResolvedValue(null);

    // when the user updates the missing hive
    const result = service.updateForAuthenticatedUser({
      authenticatedUserId: "user-1",
      hiveId: "missing-hive",
      name: "South Field",
      status: true,
    });

    // then the service returns not found
    await expect(result).rejects.toEqual(new AppError(404, "Hive not found"));
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

  it("rejects hive updates when the authenticated user cannot be resolved", async () => {
    // given the authenticated user cannot be loaded
    const service = createService();
    userRepository.findById.mockResolvedValue(null);

    // when the user updates a hive
    const result = service.updateForAuthenticatedUser({
      authenticatedUserId: "missing-user",
      hiveId: "hive-1",
      name: "South Field",
      status: true,
    });

    // then the service rejects the request as unauthorized
    await expect(result).rejects.toEqual(new AppError(401, "Unauthorized"));
    expect(hiveRepository.update).not.toHaveBeenCalled();
  });
});
