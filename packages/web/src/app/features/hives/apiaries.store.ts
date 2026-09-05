import { Injectable, computed, inject, signal } from "@angular/core";

import type { CreateApiaryRequest } from "@appiary/types";

import { ApiariesService } from "./apiaries.service";
import type { ApiaryViewModel } from "./apiaries.mapper";
import { HivesStore } from "./hives.store";

function extractErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const apiError = (error as { error?: { message?: string } }).error;
    if (typeof apiError?.message === "string") return apiError.message;
  }
  return "Something went wrong";
}

@Injectable({ providedIn: "root" })
export class ApiariesStore {
  private readonly apiariesService = inject(ApiariesService);
  private readonly hivesStore = inject(HivesStore);

  private readonly apiariesState = signal<ApiaryViewModel[]>([]);
  private readonly selectedApiaryIdState = signal<string | null>(null);
  private readonly loadingState = signal(false);
  private readonly creatingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly createErrorState = signal<string | null>(null);
  private listRequestGeneration = 0;
  private createRequestGeneration = 0;

  readonly apiaries = this.apiariesState.asReadonly();
  readonly selectedApiaryId = this.selectedApiaryIdState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly isCreating = this.creatingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly createError = this.createErrorState.asReadonly();
  readonly hasApiaries = computed(() => this.apiariesState().length > 0);

  async loadApiaries(): Promise<void> {
    const requestGeneration = ++this.listRequestGeneration;
    const apiaryIdsAtRequestStart = new Set(this.apiariesState().map(({ apiaryId }) => apiaryId));
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const listedApiaries = await this.apiariesService.listApiaries();
      if (requestGeneration !== this.listRequestGeneration) return;

      const apiariesCreatedWhileLoading = this.apiariesState()
        .filter(({ apiaryId }) => !apiaryIdsAtRequestStart.has(apiaryId));
      const createdApiaryIds = new Set(apiariesCreatedWhileLoading.map(({ apiaryId }) => apiaryId));
      const apiaries = [...listedApiaries.filter(({ apiaryId }) => !createdApiaryIds.has(apiaryId)), ...apiariesCreatedWhileLoading]
        .sort((left, right) => left.apiaryId.localeCompare(right.apiaryId));

      this.apiariesState.set(apiaries);
      const currentSelection = this.selectedApiaryIdState();
      const selectedApiaryId = currentSelection && apiaries.some(({ apiaryId }) => apiaryId === currentSelection)
        ? currentSelection
        : apiaries[0]?.apiaryId ?? null;
      this.selectedApiaryIdState.set(selectedApiaryId);
      this.loadingState.set(false);

      if (selectedApiaryId) {
        await this.hivesStore.loadHives(selectedApiaryId);
      } else {
        this.hivesStore.clearSelection();
      }
    } catch (error) {
      if (requestGeneration !== this.listRequestGeneration) return;
      if (this.apiariesState().some(({ apiaryId }) => !apiaryIdsAtRequestStart.has(apiaryId))) return;
      this.apiariesState.set([]);
      this.selectedApiaryIdState.set(null);
      this.hivesStore.clearSelection();
      this.errorState.set(extractErrorMessage(error));
    } finally {
      if (requestGeneration === this.listRequestGeneration) this.loadingState.set(false);
    }
  }

  async selectApiary(apiaryId: string): Promise<void> {
    if (apiaryId === this.selectedApiaryIdState()) return;
    if (!this.apiariesState().some((apiary) => apiary.apiaryId === apiaryId)) return;

    this.selectedApiaryIdState.set(apiaryId);
    await this.hivesStore.loadHives(apiaryId);
  }

  async createApiary(payload: CreateApiaryRequest): Promise<void> {
    const requestGeneration = ++this.createRequestGeneration;
    this.creatingState.set(true);
    this.createErrorState.set(null);

    try {
      const apiary = await this.apiariesService.createApiary(payload);
      if (requestGeneration !== this.createRequestGeneration) return;

      this.apiariesState.update((apiaries) => [...apiaries, apiary]
        .sort((left, right) => left.apiaryId.localeCompare(right.apiaryId)));
      if (this.selectedApiaryIdState() === null) {
        this.selectedApiaryIdState.set(apiary.apiaryId);
        await this.hivesStore.loadHives(apiary.apiaryId);
      }
    } catch (error) {
      if (requestGeneration !== this.createRequestGeneration) return;
      this.createErrorState.set(extractErrorMessage(error));
      throw error;
    } finally {
      if (requestGeneration === this.createRequestGeneration) this.creatingState.set(false);
    }
  }

  clearError(): void {
    this.errorState.set(null);
  }

  clearCreateError(): void {
    this.createErrorState.set(null);
  }
}
