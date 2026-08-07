# E2E Tests

This package contains Playwright browser end-to-end tests for the Appiary frontend.

## Commands

```bash
npm run test:e2e
npm run test:e2e:mocked
npm run test:e2e:real
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:install
```

## Scope

- Parallel, route-mocked UI coverage for deterministic behavior and failure states
- Two `@real-api` browser smoke journeys through Angular, Express, and PostgreSQL
- Direct real-API setup only where six persisted inspections are needed for pagination

## Structure

- `tests/`: end-to-end specs grouped by feature
- `helpers/`: route constants and test data factories

`test:e2e:mocked` excludes `@real-api` and keeps Playwright's parallel execution. `test:e2e:real` selects only `@real-api` and uses one worker because the tests share a PostgreSQL service. The aggregate `test:e2e` command runs both lanes once.

The Playwright config starts its own API through the root workspace script with `NODE_ENV=test` and defaults `DB_NAME` to `appiary_test`. Create that dedicated PostgreSQL database before running the suite; both the API and the real-E2E cleanup helper refuse any other database name. An explicit shell or CI `DB_NAME` takes priority; the root `.env` database name is ignored so a development database cannot be selected accidentally.

Real tests generate unique data and clean up only recorded account UUIDs, relying on foreign-key cascades for users, hives, and inspections. They never truncate tables. The application intentionally keeps authentication in memory, so the lifecycle smoke test expects a browser reload to return to login before persisted data is loaded with a new token.

Port 3000 must be free so Playwright can own the controlled API process. It may reuse an existing frontend locally, but it never attaches to an already-running API whose database configuration it cannot verify.
