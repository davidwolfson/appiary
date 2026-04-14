# E2E Tests

This package contains Playwright browser end-to-end tests for the Appiary frontend.

## Commands

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:install
```

## Scope

- UI flows only
- No direct API-only test coverage in this package

## Structure

- `tests/`: end-to-end specs grouped by feature
- `helpers/`: route constants and test data factories

The Playwright config starts both the API and web apps through the root workspace scripts unless matching servers are already running.
