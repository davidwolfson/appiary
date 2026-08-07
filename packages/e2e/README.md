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

The Playwright config always starts its own API through the root workspace script with `NODE_ENV=test` and `DB_NAME=appiary_test`. Create that dedicated PostgreSQL database before running the suite; the API refuses to connect or migrate if test mode uses any other database name. Connection host, port, user, and password can come from the shell or root `.env`.

Port 3000 must be free so Playwright can own the controlled API process. It may reuse an existing frontend locally, but it never attaches to an already-running API whose database configuration it cannot verify.
