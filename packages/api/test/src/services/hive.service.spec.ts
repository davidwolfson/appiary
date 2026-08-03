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
  const hiveInspectionRepository = {
    createForAccount: vi.fn(),
    findFirstPageForHiveIds: vi.fn(),
    findPageForAccount: vi.fn(),
  };

  beforeEach(() => {
    hiveRepository.create.mockReset();
    hiveRepository.findByAccountId.mockReset();
    hiveRepository.update.mockReset();
    userRepository.findById.mockReset();
    hiveInspectionRepository.createForAccount.mockReset();
    hiveInspectionRepository.findFirstPageForHiveIds.mockReset();
    hiveInspectionRepository.findPageForAccount.mockReset();
    hiveInspectionRepository.findFirstPageForHiveIds.mockResolvedValue(new Map());
  });

  function createService() {
    return new HiveService(hiveRepository as never, userRepository as never, hiveInspectionRepository as never);
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
    hiveInspectionRepository.findFirstPageForHiveIds.mockResolvedValue(new Map([["hive-1", { inspections: [{
      inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-31",
      inspectionTime: "14:30", queenRight: true, eggs: false, larva: true, cappedBrood: false,
      broodPattern: "good", additionalNotes: null, createdAt: new Date(), updatedAt: new Date(),
    }], totalItems: 1 }]]));

    // when the user's hives are requested
    const result = service.listForAuthenticatedUser("user-1");

    // then the repository is scoped to the account and the hives are returned
    await expect(result).resolves.toEqual({
      hives: [
        {
          hiveId: "hive-1",
          name: "North Field",
          status: true,
          inspectionPagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 },
          inspections: [{
            inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-31",
            inspectionTime: "14:30", queenRight: true, eggs: false, larva: true, cappedBrood: false,
            broodPattern: "good", additionalNotes: null,
          }],
        },
      ],
    });
    expect(hiveRepository.findByAccountId).toHaveBeenCalledWith("account-1");
    expect(hiveInspectionRepository.findFirstPageForHiveIds).toHaveBeenCalledWith(["hive-1"]);
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
        inspectionPagination: { page: 1, pageSize: 5, totalItems: 0, totalPages: 0 },
        inspections: [],
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
    const existingInspection = {
      inspectionId: "inspection-1",
      hiveId: existingHive.hiveId,
      inspectionDate: "2026-07-31",
      inspectionTime: "14:30",
      queenRight: true,
      eggs: true,
      larva: true,
      cappedBrood: false,
      broodPattern: "good",
      additionalNotes: "Healthy colony",
      createdAt: new Date(),
      updatedAt: new Date(),
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
    hiveInspectionRepository.findFirstPageForHiveIds.mockResolvedValue(new Map([
      [existingHive.hiveId, { inspections: [existingInspection], totalItems: 1 }],
    ]));

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
        inspectionPagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 },
        inspections: [{
          inspectionId: existingInspection.inspectionId,
          hiveId: existingInspection.hiveId,
          inspectionDate: existingInspection.inspectionDate,
          inspectionTime: existingInspection.inspectionTime,
          queenRight: existingInspection.queenRight,
          eggs: existingInspection.eggs,
          larva: existingInspection.larva,
          cappedBrood: existingInspection.cappedBrood,
          broodPattern: existingInspection.broodPattern,
          additionalNotes: existingInspection.additionalNotes,
        }],
      },
    });
    expect(hiveRepository.update).toHaveBeenCalledWith({
      accountId: existingHive.accountId,
      hiveId: existingHive.hiveId,
      name: updatePayload.name,
      status: updatePayload.status,
    });
    expect(hiveInspectionRepository.findFirstPageForHiveIds).toHaveBeenCalledWith([existingHive.hiveId]);
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
    expect(hiveInspectionRepository.findFirstPageForHiveIds).not.toHaveBeenCalled();
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

  it("creates an inspection for an owned hive", async () => {
    // given the authenticated user owns the target hive
    const service = createService();
    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    hiveInspectionRepository.createForAccount.mockResolvedValue({
      inspectionId: "inspection-1", hiveId: "hive-1", inspectionDate: "2026-07-31",
      inspectionTime: "14:30", queenRight: true, eggs: true, larva: false, cappedBrood: true,
      broodPattern: "good", additionalNotes: null, createdAt: new Date(), updatedAt: new Date(),
    });

    // when the user creates an inspection
    const result = service.createInspectionForAuthenticatedUser({
      authenticatedUserId: "user-1", hiveId: "hive-1", inspectionDate: "2026-07-31",
      inspectionTime: "14:30", queenRight: true, eggs: true, larva: false, cappedBrood: true,
      broodPattern: "good", additionalNotes: null,
    });

    // then the scoped inspection is returned
    await expect(result).resolves.toMatchObject({ inspection: { inspectionId: "inspection-1", hiveId: "hive-1" } });
    expect(hiveInspectionRepository.createForAccount).toHaveBeenCalledWith(expect.objectContaining({
      accountId: "account-1", hiveId: "hive-1",
    }));
  });

  it("returns a requested inspection page with pagination metadata", async () => {
    // given the authenticated account owns a hive with a second inspection page
    const service = createService();
    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    hiveInspectionRepository.findPageForAccount.mockResolvedValue({
      inspections: [{
        inspectionId: "inspection-6", hiveId: "hive-1", inspectionDate: "2026-07-25",
        inspectionTime: "09:00", queenRight: false, eggs: false, larva: false,
        cappedBrood: false, broodPattern: null, additionalNotes: null,
        createdAt: new Date(), updatedAt: new Date(),
      }],
      totalItems: 6,
    });

    // when page two is requested
    const result = await service.listInspectionsForAuthenticatedUser("user-1", "hive-1", 2);

    // then the repository is account-scoped and page metadata is returned
    expect(hiveInspectionRepository.findPageForAccount).toHaveBeenCalledWith({
      accountId: "account-1", hiveId: "hive-1", page: 2,
    });
    expect(result).toMatchObject({
      inspections: [{ inspectionId: "inspection-6" }],
      pagination: { page: 2, pageSize: 5, totalItems: 6, totalPages: 2 },
    });
  });

  it("does not disclose missing or foreign-owned hives when paging inspections", async () => {
    // given the scoped repository cannot find the hive
    const service = createService();
    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    hiveInspectionRepository.findPageForAccount.mockResolvedValue(null);

    // when its inspection page is requested
    const result = service.listInspectionsForAuthenticatedUser("user-1", "foreign-hive", 1);

    // then the route-level domain response remains non-disclosing
    await expect(result).rejects.toEqual(new AppError(404, "Hive not found"));
  });

  it("does not disclose missing or foreign-owned hives during inspection creation", async () => {
    // given no hive is visible in the authenticated account
    const service = createService();
    userRepository.findById.mockResolvedValue({ id: "user-1", accountId: "account-1" });
    hiveInspectionRepository.createForAccount.mockResolvedValue(null);

    // when an inspection is created for that hive
    const result = service.createInspectionForAuthenticatedUser({
      authenticatedUserId: "user-1", hiveId: "foreign-hive", inspectionDate: "2026-07-31",
      inspectionTime: "14:30", queenRight: false, eggs: false, larva: false, cappedBrood: false,
      broodPattern: null, additionalNotes: null,
    });

    // then the same non-disclosing not-found error is returned
    await expect(result).rejects.toEqual(new AppError(404, "Hive not found"));
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
