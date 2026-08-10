# Appiary

Appiary is a full-stack application for tracking an apiary. After creating an account or signing in, a beekeeper can manage hives and record, browse, and review hive inspections.

## What it does

- Creates accounts and authenticates users with bearer tokens.
- Keeps each account's hives and inspections private to that account.
- Creates and edits hives, including whether a hive is active or inactive.
- Filters the dashboard by active, inactive, or all hives.
- Records inspections with date, time, queen-right and brood observations, brood pattern, and notes.
- Shows inspection history newest first, five inspections at a time, with independent pagination for each hive.
- Logs users out after five minutes without browser activity; server tokens expire after seven days and are revoked on logout.

## Tech stack

- Angular 21 standalone frontend with Bootstrap 5
- Express and TypeScript API
- PostgreSQL database with SQL migrations
- Shared TypeScript API contracts in `packages/types`
- Vitest unit/API tests and Playwright end-to-end tests

## Project layout

```text
packages/
  api/       Express API, database migrations, and API tests
  web/       Angular application
  types/     Shared request and response contracts
  e2e/       Playwright browser tests
```

## Prerequisites

- Node.js 22 (the version used in CI)
- npm
- PostgreSQL 16 or a compatible PostgreSQL installation

The database user needs permission to create the `pgcrypto` extension, which the initial migration uses for UUID generation.

## Local setup

1. Install workspace dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file from the example and update it for your PostgreSQL instance:

   ```bash
   cp .env.example .env
   ```

   On PowerShell, use `Copy-Item .env.example .env`.

3. Configure the following values in `.env`:

   ```dotenv
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=appiary
   DB_USER=postgres
   DB_PASSWORD=postgres
   JWT_SECRET=replace-with-a-long-random-secret
   PORT=3000
   CLIENT_ORIGIN=http://localhost:4200
   ```

4. Start the API and frontend in separate terminals:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

5. Open `http://localhost:4200`, register an account, and add your first hive.

On startup, the API applies pending migrations from `packages/api/db/migrations` and verifies the resulting schema. The Angular development server proxies `/api/*` to `http://localhost:3000`, so both processes must be running for the application to work locally.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run build` | Build the shared types, API, and frontend. |
| `npm run dev:api` | Start the API with file watching. |
| `npm run dev:web` | Start the Angular development server. |
| `npm run lint` | Lint authored TypeScript and Angular templates; warnings fail the command. |
| `npm run test:api` | Run API tests against the dedicated `appiary_test` PostgreSQL database. |
| `npm run test:api:ci` | Run API tests with coverage enforcement and JUnit output. |
| `npm run test:web` | Run frontend unit tests. |
| `npm run test:web:ci` | Run frontend tests with coverage enforcement and JUnit output. |
| `npm run test:e2e` | Run Playwright tests; starts local API and web servers when needed. |
| `npm run test:e2e:mocked` | Run the full mocked Chromium suite, including required Axe scans. |
| `npm run test:e2e:real` | Run the two real-API Chromium journeys with one worker. |
| `npm run test:e2e:browser-smoke` | Run two mocked smoke journeys on Firefox, WebKit, and Pixel 7 emulation. |
| `npm run test:e2e:headed` | Run browser tests with a visible browser. |
| `npm run test:e2e:ui` | Open the Playwright UI. |
| `npm run test:e2e:install` | Install Playwright browsers. |
| `npm run typecheck:e2e` | Type-check the Playwright config, helpers, pages, and specs. |

## Routes and API

The frontend uses `/` for the authenticated hive dashboard, `/login` for sign-in, and `/register` for account creation.

The API is served under `/api`:

| Method | Path | Authentication | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Health check. |
| `POST` | `/api/auth/register` | No | Create an account and user, then return an auth token. |
| `POST` | `/api/auth/login` | No | Sign in and return an auth token. |
| `POST` | `/api/auth/logout` | Bearer token | Revoke the current token. |
| `GET` | `/api/auth/me` | Bearer token | Return the current user. |
| `GET` | `/api/hives` | Bearer token | List the account's hives and their first inspection-history page. |
| `POST` | `/api/hives` | Bearer token | Create a hive. |
| `PUT` | `/api/hives/:hiveId` | Bearer token | Update a hive's name or status. |
| `GET` | `/api/hives/:hiveId/inspections?page=1` | Bearer token | Retrieve a page of that hive's inspection history. |
| `POST` | `/api/hives/:hiveId/inspections` | Bearer token | Record an inspection for a hive. |

Protected requests use `Authorization: Bearer <token>`. The shared request and response types are exported from `@appiary/types`.

## Testing notes

API and end-to-end tests use a dedicated PostgreSQL database named exactly `appiary_test`; they never use the normal `appiary` development database. Create it locally with credentials matching your `.env` before running either suite, for example:

```bash
createdb -h localhost -U postgres appiary_test
```

Test runners set `NODE_ENV=test` and `DB_NAME=appiary_test` themselves. The API fails before opening a database pool or running migrations if test mode is configured with any other database name. Shell and CI connection values take precedence; Vitest supplies local defaults for values not provided, while Playwright's managed API can fill missing connection values from `.env`.

The CI workflow uses a disposable PostgreSQL 16 service with the same database name and Node.js 22. Playwright uses Chromium and can install it with `npm run test:e2e:install`. It always starts its own controlled API process, so port 3000 must be free; an existing API on that port makes the E2E run fail safely.

## Quality gates and CI evidence

GitHub Actions runs lint, the production build, and the E2E TypeScript check as a dedicated quality job. API and web CI tests enforce global minimum coverage of 80% for statements, branches, functions, and lines. Coverage includes unimported production modules. API excludes only declarations and the side-effect-only `server.ts` process bootstrap; web excludes specs, declarations, and the provider-only `app.config.ts` application bootstrap.

API and web jobs retain JUnit plus HTML, LCOV, and JSON-summary coverage for 30 days. Their artifacts are named `api-test-results-<run>-<attempt>` and `web-test-results-<run>-<attempt>`. Playwright retains separate mocked and real-API HTML/JUnit reports, along with any retry traces and failure screenshots/videos, for 14 days in `e2e-mocked-test-results-<run>-<attempt>` and `e2e-real-test-results-<run>-<attempt>`.

Download evidence from the workflow run's **Artifacts** section. Open a coverage artifact's `index.html` in a browser. For Playwright, extract the entire HTML report before opening `index.html`; inspect a trace with `npx playwright show-trace <trace.zip>`. Screenshots and videos are produced only on failure, while traces are produced on the first retry, so successful runs may not contain media attachments.

Pull requests use mocked Chromium coverage for deterministic UI behavior, including seven blocking WCAG 2.2 A/AA Axe states, and a separate single-worker Chromium lane against the real API and PostgreSQL. Axe confirmed violations fail the lane; incomplete checks are attached for human review. A separate weekly/manual workflow runs two `@browser-smoke` mocked journeys on Firefox Desktop, WebKit Desktop Safari, and Pixel 7 emulation, without expanding the full or `@real-api` suites. Its HTML, JUnit, trace, screenshot, and video outputs are retained for 14 days as `e2e-browser-smoke-test-results-<run>-<attempt>`.
