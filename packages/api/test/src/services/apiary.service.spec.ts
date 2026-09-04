import { beforeEach, describe, expect, it, vi } from "vitest";

import { DuplicateApiaryNameError } from "../../../src/repositories/apiary.repository.js";
import { ApiaryService } from "../../../src/services/apiary.service.js";
import { AppError } from "../../../src/utils/app-error.js";

describe("ApiaryService", () => {
  const apiaryRepository = {
    create: vi.fn(),
    findByAccountId: vi.fn(),
  };
  const userRepository = { findById: vi.fn() };

  beforeEach(() => {
    apiaryRepository.create.mockReset();
    apiaryRepository.findByAccountId.mockReset();
    userRepository.findById.mockReset();
  });

  function createService() {
    return new ApiaryService(apiaryRepository as never, userRepository as never);
  }

  it("lists all apiaries for the authenticated user's account", async () => {
    // given the user belongs to an account with active and inactive apiaries
    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    apiaryRepository.findByAccountId.mockResolvedValue([
      { apiaryId: "apiary-1", accountId: "account-1", name: "North", status: true, createdAt: new Date(), updatedAt: new Date() },
      { apiaryId: "apiary-2", accountId: "account-1", name: "South", status: false, createdAt: new Date(), updatedAt: new Date() },
    ]);
    const service = createService();

    // when the user's apiaries are requested
    const result = service.listForAuthenticatedUser("user-1");

    // then the account-scoped public results include both statuses
    await expect(result).resolves.toEqual({ apiaries: [
      { apiaryId: "apiary-1", name: "North", status: true },
      { apiaryId: "apiary-2", name: "South", status: false },
    ] });
    expect(apiaryRepository.findByAccountId).toHaveBeenCalledWith("account-1");
  });

  it("creates a normalized apiary for the authenticated user's account", async () => {
    // given the authenticated user belongs to an account
    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    apiaryRepository.create.mockResolvedValue({
      apiaryId: "apiary-1", accountId: "account-1", name: "North Yard", status: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    const service = createService();

    // when a padded apiary name is created
    const result = service.createForAuthenticatedUser({ authenticatedUserId: "user-1", name: "  North Yard  " });

    // then the repository receives the normalized account data and the public result is returned
    await expect(result).resolves.toEqual({
      apiary: { apiaryId: "apiary-1", name: "North Yard", status: true },
    });
    expect(apiaryRepository.create).toHaveBeenCalledWith({ accountId: "account-1", name: "North Yard" });
  });

  it("maps duplicate apiary names to conflict errors", async () => {
    // given the repository rejects a duplicate apiary name
    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    apiaryRepository.create.mockRejectedValue(new DuplicateApiaryNameError());
    const service = createService();

    // when the duplicate apiary is created
    const result = service.createForAuthenticatedUser({ authenticatedUserId: "user-1", name: "North Yard" });

    // then the service returns a stable domain conflict
    await expect(result).rejects.toEqual(new AppError(409, "Apiary name already exists"));
  });

  it.each(["list", "create"])("rejects %s when the authenticated user cannot be resolved", async (operation) => {
    // given the authenticated user does not exist
    userRepository.findById.mockResolvedValue(null);
    const service = createService();

    // when the user attempts the apiary operation
    const result = operation === "list"
      ? service.listForAuthenticatedUser("missing-user")
      : service.createForAuthenticatedUser({ authenticatedUserId: "missing-user", name: "North Yard" });

    // then the operation remains unauthorized and no apiary data is accessed
    await expect(result).rejects.toEqual(new AppError(401, "Unauthorized"));
    expect(apiaryRepository.findByAccountId).not.toHaveBeenCalled();
    expect(apiaryRepository.create).not.toHaveBeenCalled();
  });
});
