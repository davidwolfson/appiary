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

  async loadHives(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    this.hivesState.set([]);
    this.inspectionPaginationState.set({});

    try {
      const hives = await this.hivesService.listHives();
      this.hivesState.set(hives);
    } catch (error) {
      this.hivesState.set([]);
      this.errorState.set(extractErrorMessage(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  async createHive(payload: CreateHiveRequest): Promise<void> {
    this.creatingState.set(true);
    this.createErrorState.set(null);

    try {
      const hive = await this.hivesService.createHive(payload);
      this.hivesState.update((hives) => [...hives, hive]);
    } catch (error) {
      this.createErrorState.set(extractErrorMessage(error));
      throw error;
    } finally {
      this.creatingState.set(false);
    }
  }

  async updateHive(hiveId: string, payload: UpdateHiveRequest): Promise<void> {
    this.updatingState.set(true);
    this.updateErrorState.set(null);

    try {
      const updatedHive = await this.hivesService.updateHive(hiveId, payload);
      this.hivesState.update((hives) => hives.map((hive) => (
        hive.hiveId === hiveId ? updatedHive : hive
      )));
    } catch (error) {
      this.updateErrorState.set(extractErrorMessage(error));
      throw error;
    } finally {
      this.updatingState.set(false);
    }
  }

  async createInspection(hiveId: string, payload: CreateHiveInspectionRequest): Promise<void> {
    this.savingInspectionState.set(true);
    this.inspectionErrorState.set(null);

    try {
      const inspection = await this.hivesService.createInspection(hiveId, payload);
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
      this.inspectionErrorState.set(extractErrorMessage(error));
      throw error;
    } finally {
      this.savingInspectionState.set(false);
    }
  }

  async loadInspectionPage(hiveId: string, page: number): Promise<void> {
    if (this.isLoadingInspectionPage(hiveId)) return;

    this.updateInspectionPaginationState(hiveId, {
      loadingPage: page,
      failure: null,
    });
    try {
      const result = await this.hivesService.listInspections(hiveId, page);
      this.hivesState.update((hives) => hives.map((hive) => hive.hiveId === hiveId
        ? { ...hive, inspections: result.inspections, inspectionPagination: result.pagination }
        : hive));
    } catch (error) {
      this.updateInspectionPaginationState(hiveId, {
        loadingPage: page,
        failure: { message: extractErrorMessage(error), page },
      });
    } finally {
      const currentState = this.inspectionPaginationState()[hiveId];
      if (currentState) {
        this.updateInspectionPaginationState(hiveId, {
          ...currentState,
          loadingPage: null,
        });
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
}
