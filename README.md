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
| `npm run test:api` | Run API tests. Requires a configured PostgreSQL database. |
| `npm run test:web` | Run frontend unit tests. |
| `npm run test:e2e` | Run Playwright tests; starts local API and web servers when needed. |
| `npm run test:e2e:headed` | Run browser tests with a visible browser. |
| `npm run test:e2e:ui` | Open the Playwright UI. |
| `npm run test:e2e:install` | Install Playwright browsers. |

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

API and end-to-end tests need a PostgreSQL database matching the `.env` configuration. The CI workflow uses a disposable PostgreSQL 16 database named `appiary_test` and Node.js 22. Playwright uses Chromium and can install it with `npm run test:e2e:install`.
