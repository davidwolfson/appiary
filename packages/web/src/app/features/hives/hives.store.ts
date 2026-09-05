import { Injectable, computed, inject, signal } from "@angular/core";

import type { CreateHiveInspectionRequest, UpdateHiveRequest, CreateHiveRequest } from "@appiary/types";

import { HivesService } from "./hives.service";
import type { HiveViewModel } from "./hives.mapper";

interface InspectionPaginationFailure {
  message: string;
  page: number;
}

interface InspectionPaginationRequestState {
  loadingPage: number | null;
  failure: InspectionPaginationFailure | null;
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const apiError = (error as { error?: { message?: string } }).error;
    if (typeof apiError?.message === "string") {
      return apiError.message;
    }
  }

  return "Something went wrong";
}

@Injectable({ providedIn: "root" })
export class HivesStore {
  private readonly hivesService = inject(HivesService);

  private readonly hivesState = signal<HiveViewModel[]>([]);
  private readonly loadingState = signal(false);
  private readonly creatingState = signal(false);
  private readonly updatingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly createErrorState = signal<string | null>(null);
  private readonly updateErrorState = signal<string | null>(null);
  private readonly savingInspectionState = signal(false);
  private readonly inspectionErrorState = signal<string | null>(null);
  private readonly inspectionPaginationState = signal<Record<string, InspectionPaginationRequestState>>({});
  private activeApiaryId: string | null = null;
  private hiveListRequestGeneration = 0;
  private createRequestGeneration = 0;
  private updateRequestGeneration = 0;
  private inspectionSaveRequestGeneration = 0;
  private inspectionRequestGeneration = 0;

  readonly hives = this.hivesState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly isCreating = this.creatingState.asReadonly();
  readonly isUpdating = this.updatingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly createError = this.createErrorState.asReadonly();
  readonly updateError = this.updateErrorState.asReadonly();
  readonly isSavingInspection = this.savingInspectionState.asReadonly();
  readonly inspectionError = this.inspectionErrorState.asReadonly();
  readonly hasHives = computed(() => this.hivesState().length > 0);

  isLoadingInspectionPage(hiveId: string): boolean {
    return this.inspectionPaginationState()[hiveId]?.loadingPage != null;
  }

  inspectionPaginationFailure(hiveId: string): InspectionPaginationFailure | null {
    return this.inspectionPaginationState()[hiveId]?.failure ?? null;
  }

  async loadHives(apiaryId: string): Promise<void> {
    this.beginSelection(apiaryId);
    const requestGeneration = this.hiveListRequestGeneration;
    this.loadingState.set(true);

    try {
      const hives = await this.hivesService.listHives(apiaryId);
      if (requestGeneration !== this.hiveListRequestGeneration || apiaryId !== this.activeApiaryId) return;
      this.hivesState.set(hives);
    } catch (error) {
      if (requestGeneration !== this.hiveListRequestGeneration || apiaryId !== this.activeApiaryId) return;
      this.hivesState.set([]);
      this.errorState.set(extractErrorMessage(error));
    } finally {
      if (requestGeneration === this.hiveListRequestGeneration && apiaryId === this.activeApiaryId) {
        this.loadingState.set(false);
      }
    }
  }

  clearSelection(): void {
    this.beginSelection(null);
  }

  async createHive(payload: CreateHiveRequest): Promise<void> {
    const requestGeneration = ++this.createRequestGeneration;
    const selectionGeneration = this.hiveListRequestGeneration;
    this.creatingState.set(true);
    this.createErrorState.set(null);

    try {
      const hive = await this.hivesService.createHive(payload);
      if (requestGeneration !== this.createRequestGeneration || selectionGeneration !== this.hiveListRequestGeneration) return;
      if (hive.apiaryId === this.activeApiaryId) {
        this.hivesState.update((hives) => [...hives, hive]);
      }
    } catch (error) {
      if (requestGeneration !== this.createRequestGeneration || selectionGeneration !== this.hiveListRequestGeneration) return;
      this.createErrorState.set(extractErrorMessage(error));
      throw error;
    } finally {
      if (requestGeneration === this.createRequestGeneration && selectionGeneration === this.hiveListRequestGeneration) {
        this.creatingState.set(false);
      }
    }
  }

  async updateHive(hiveId: string, payload: UpdateHiveRequest): Promise<void> {
    const requestGeneration = ++this.updateRequestGeneration;
    const selectionGeneration = this.hiveListRequestGeneration;
    this.updatingState.set(true);
    this.updateErrorState.set(null);

    try {
      const updatedHive = await this.hivesService.updateHive(hiveId, payload);
      if (requestGeneration !== this.updateRequestGeneration || selectionGeneration !== this.hiveListRequestGeneration) return;
      this.hivesState.update((hives) => updatedHive.apiaryId === this.activeApiaryId
        ? hives.map((hive) => hive.hiveId === hiveId ? updatedHive : hive)
        : hives.filter((hive) => hive.hiveId !== hiveId));
    } catch (error) {
      if (requestGeneration !== this.updateRequestGeneration || selectionGeneration !== this.hiveListRequestGeneration) return;
      this.updateErrorState.set(extractErrorMessage(error));
      throw error;
    } finally {
      if (requestGeneration === this.updateRequestGeneration && selectionGeneration === this.hiveListRequestGeneration) {
        this.updatingState.set(false);
      }
    }
  }

  async createInspection(hiveId: string, payload: CreateHiveInspectionRequest): Promise<void> {
    const requestGeneration = ++this.inspectionSaveRequestGeneration;
    const selectionGeneration = this.hiveListRequestGeneration;
    this.savingInspectionState.set(true);
    this.inspectionErrorState.set(null);

    try {
      const inspection = await this.hivesService.createInspection(hiveId, payload);
      if (requestGeneration !== this.inspectionSaveRequestGeneration || selectionGeneration !== this.hiveListRequestGeneration) return;
      this.hivesState.update((hives) => hives.map((hive) => hive.hiveId === hiveId
        ? {
          ...hive,
          inspections: [inspection, ...(hive.inspections ?? [])]
            .sort((left, right) => `${right.inspectionDate}T${right.inspectionTime}`.localeCompare(`${left.inspectionDate}T${left.inspectionTime}`))
            .slice(0, hive.inspectionPagination?.pageSize ?? Number.POSITIVE_INFINITY),
          ...(hive.inspectionPagination ? { inspectionPagination: {
            ...hive.inspectionPagination,
            page: 1,
            totalItems: hive.inspectionPagination.totalItems + 1,
            totalPages: Math.ceil((hive.inspectionPagination.totalItems + 1) / hive.inspectionPagination.pageSize),
          } } : {}),
        }
        : hive));
    } catch (error) {
      if (requestGeneration !== this.inspectionSaveRequestGeneration || selectionGeneration !== this.hiveListRequestGeneration) return;
      this.inspectionErrorState.set(extractErrorMessage(error));
      throw error;
    } finally {
      if (requestGeneration === this.inspectionSaveRequestGeneration && selectionGeneration === this.hiveListRequestGeneration) {
        this.savingInspectionState.set(false);
      }
    }
  }

  async loadInspectionPage(hiveId: string, page: number): Promise<void> {
    if (this.isLoadingInspectionPage(hiveId)) return;

    const requestGeneration = this.inspectionRequestGeneration;
    this.updateInspectionPaginationState(hiveId, {
      loadingPage: page,
      failure: null,
    });
    try {
      const result = await this.hivesService.listInspections(hiveId, page);
      if (requestGeneration !== this.inspectionRequestGeneration) return;

      this.hivesState.update((hives) => hives.map((hive) => hive.hiveId === hiveId
        ? { ...hive, inspections: result.inspections, inspectionPagination: result.pagination }
        : hive));
    } catch (error) {
      if (requestGeneration !== this.inspectionRequestGeneration) return;

      this.updateInspectionPaginationState(hiveId, {
        loadingPage: page,
        failure: { message: extractErrorMessage(error), page },
      });
    } finally {
      if (requestGeneration === this.inspectionRequestGeneration) {
        const currentState = this.inspectionPaginationState()[hiveId];
        if (currentState) {
          this.updateInspectionPaginationState(hiveId, {
            ...currentState,
            loadingPage: null,
          });
        }
      }
    }
  }

  async retryInspectionPage(hiveId: string): Promise<void> {
    const failure = this.inspectionPaginationFailure(hiveId);
    if (!failure || this.isLoadingInspectionPage(hiveId)) return;

    await this.loadInspectionPage(hiveId, failure.page);
  }

  clearError(): void {
    this.errorState.set(null);
  }

  clearCreateError(): void {
    this.createErrorState.set(null);
  }

  clearUpdateError(): void {
    this.updateErrorState.set(null);
  }

  clearInspectionError(): void {
    this.inspectionErrorState.set(null);
  }

  private updateInspectionPaginationState(
    hiveId: string,
    state: InspectionPaginationRequestState,
  ): void {
    this.inspectionPaginationState.update((currentState) => ({
      ...currentState,
      [hiveId]: state,
    }));
  }

  private beginSelection(apiaryId: string | null): void {
    this.activeApiaryId = apiaryId;
    this.hiveListRequestGeneration += 1;
    this.createRequestGeneration += 1;
    this.updateRequestGeneration += 1;
    this.inspectionSaveRequestGeneration += 1;
    this.inspectionRequestGeneration += 1;
    this.hivesState.set([]);
    this.loadingState.set(false);
    this.creatingState.set(false);
    this.updatingState.set(false);
    this.savingInspectionState.set(false);
    this.errorState.set(null);
    this.createErrorState.set(null);
    this.updateErrorState.set(null);
    this.inspectionErrorState.set(null);
    this.inspectionPaginationState.set({});
  }
}
