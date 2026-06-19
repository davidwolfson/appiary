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

    await expect(service.listForAuthenticatedUser("user-1")).resolves.toEqual({
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

    await expect(service.createForAuthenticatedUser({
      authenticatedUserId: "user-1",
      name: "  North Field  ",
      status: true,
    })).resolves.toEqual({
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
    const service = createService();

    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    hiveRepository.create.mockRejectedValue(new DuplicateHiveNameError());

    await expect(service.createForAuthenticatedUser({
      authenticatedUserId: "user-1",
      name: "North Field",
      status: true,
    })).rejects.toEqual(new AppError(409, "Hive name already exists"));
  });

  it("rejects when the authenticated user cannot be resolved", async () => {
    const service = createService();

    userRepository.findById.mockResolvedValue(null);

    await expect(service.listForAuthenticatedUser("missing-user")).rejects.toEqual(
      new AppError(401, "Unauthorized"),
    );
    await expect(service.createForAuthenticatedUser({
      authenticatedUserId: "missing-user",
      name: "North Field",
      status: true,
    })).rejects.toEqual(new AppError(401, "Unauthorized"));
  });
});
