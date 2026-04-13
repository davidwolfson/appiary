# Appiary

Monorepo implementing the registration/login PRD with:

- `packages/api`: Express + TypeScript + Zod + PostgreSQL
- `packages/web`: Angular standalone app + Bootstrap 5
- `packages/types`: shared DTO contract

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`.

3. Create the PostgreSQL schema:

```bash
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f packages/api/db/schema.sql
```

4. Start the apps:

```bash
npm run dev:api
npm run dev:web
```

The Angular dev server proxies `/api/*` requests to `http://localhost:3000`, so the API still needs to be running locally for registration and login to work.

## Routes

- Frontend: `/login`, `/register`, `/`
- API: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
