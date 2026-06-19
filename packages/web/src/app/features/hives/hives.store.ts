import { Injectable, computed, inject, signal } from "@angular/core";

import type { CreateHiveRequest } from "@appiary/types";

import { HivesService } from "./hives.service";
import type { HiveViewModel } from "./hives.mapper";

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
  private readonly errorState = signal<string | null>(null);
  private readonly createErrorState = signal<string | null>(null);

  readonly hives = this.hivesState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly isCreating = this.creatingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly createError = this.createErrorState.asReadonly();
  readonly hasHives = computed(() => this.hivesState().length > 0);

  async loadHives(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    this.hivesState.set([]);

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

  clearError(): void {
    this.errorState.set(null);
  }

  clearCreateError(): void {
    this.createErrorState.set(null);
  }
}
