# E2E Tests

This package contains Playwright browser end-to-end tests for the Appiary frontend.

## Commands

```bash
npm run test:e2e
npm run test:e2e:mocked
npm run test:e2e:real
npm run test:e2e:browser-smoke
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:install
npm run typecheck:e2e
```

## Scope

- Parallel, route-mocked UI coverage for deterministic behavior and failure states
- Seven required Axe scans of stable guest, dashboard, and dialog states
- Two `@real-api` browser smoke journeys through Angular, Express, and PostgreSQL
- Two `@browser-smoke` journeys on Firefox Desktop, WebKit Desktop Safari, and Pixel 7 emulation
- Direct real-API setup only where six persisted inspections are needed for pagination

## Structure

- `tests/`: end-to-end specs grouped by feature
- `helpers/`: route constants and test data factories

`test:e2e:mocked` excludes `@real-api`, explicitly selects Chromium, and keeps Playwright's parallel execution. `test:e2e:real` selects only `@real-api`, explicitly selects Chromium, and uses one worker because the tests share a PostgreSQL service. The aggregate `test:e2e` command runs both lanes once. `test:e2e:browser-smoke` selects only the three secondary projects and defensively requires `@browser-smoke` while excluding `@real-api`.

The mocked Chromium lane blocks on confirmed Axe violations in the cumulative WCAG 2.0, 2.1, and 2.2 Level A/AA rule tags. Every scan attaches normalized JSON containing confirmed `violations` and `incomplete` checks. Incomplete checks require human review but do not represent confirmed violations. Do not add baselines, blanket exclusions, or broad rule disables; a verified false positive may use only a narrow documented exception linked to a follow-up issue.

The Playwright config starts its own API through the root workspace script with `NODE_ENV=test` and defaults `DB_NAME` to `appiary_test`. Create that dedicated PostgreSQL database before running the suite; both the API and the real-E2E cleanup helper refuse any other database name. An explicit shell or CI `DB_NAME` takes priority; the root `.env` database name is ignored so a development database cannot be selected accidentally.

Real tests generate unique data and clean up only recorded account UUIDs, relying on foreign-key cascades for users, hives, and inspections. They never truncate tables. The application intentionally keeps authentication in memory, so the lifecycle smoke test expects a browser reload to return to login before persisted data is loaded with a new token.

Port 3000 must be free so Playwright can own the controlled API process. It may reuse an existing frontend locally, but it never attaches to an already-running API whose database configuration it cannot verify.

## Reports and CI artifacts

Set `PLAYWRIGHT_LANE` to `mocked`, `real`, or `browser-smoke` when reproducing a CI lane. If it is omitted, local aggregate runs use `all`; any other value is rejected. Each lane writes an HTML report to `playwright-report/<lane>/`, JUnit to `test-results/<lane>/junit.xml`, and traces/screenshots/videos to `test-results/<lane>/artifacts/` when the configured retry or failure policy produces them.

GitHub Actions uploads mocked and real results immediately after their respective runs. Artifacts are named `e2e-mocked-test-results-<run>-<attempt>` and `e2e-real-test-results-<run>-<attempt>` and are retained for 14 days. Download and extract the complete HTML directory before opening `index.html`; open a trace with `npx playwright show-trace <trace.zip>`.

The mocked lane is parallel Chromium coverage for deterministic UI behavior and required accessibility scanning. The real lane is a single-worker Chromium smoke suite because it shares PostgreSQL state. A separate weekly/manual workflow runs exactly two tagged mocked tests in Firefox Desktop, WebKit Desktop Safari, and Playwright's Pixel 7 Chromium descriptor. It uploads `e2e-browser-smoke-test-results-<run>-<attempt>` for 14 days. Install these engines locally with `npx playwright install chromium firefox webkit`. Pixel 7 is browser/device emulation, not physical-device validation.
