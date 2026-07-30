import { expect } from "@playwright/test";

const defaultObservationPeriodMs = 500;

export async function expectNoRequests(
  requests: readonly unknown[],
  observationPeriodMs = defaultObservationPeriodMs,
): Promise<void> {
  // A zero-length assertion can pass before asynchronously dispatched requests
  // reach Playwright's route handler, so observe the collection before asserting.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, observationPeriodMs);
  });

  expect(requests).toHaveLength(0);
}
