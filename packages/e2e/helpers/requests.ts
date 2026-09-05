import { expect } from "@playwright/test";

const defaultObservationPeriodMs = 500;

export async function expectNoRequests(
  requests: readonly unknown[],
  observationPeriodMs = defaultObservationPeriodMs,
): Promise<void> {
  await expectRequestCountToRemain(requests, 0, observationPeriodMs);
}

export async function expectRequestCountToRemain(
  requests: readonly unknown[],
  expectedCount: number,
  observationPeriodMs = defaultObservationPeriodMs,
): Promise<void> {
  // A request-count assertion can pass before asynchronously dispatched requests
  // reach Playwright's route handler, so observe the collection before asserting.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, observationPeriodMs);
  });

  expect(requests).toHaveLength(expectedCount);
}
