# Shared Types Conventions

## Purpose

This document defines conventions for `packages/types`, the shared contract package used by the API, web app, and E2E tests.

---

# Core Principles

1. Shared types are API contracts, not implementation models.
2. Group types by domain or shared purpose.
3. Keep `src/index.ts` as the public barrel for consumers.
4. Avoid one-interface-per-file unless the type owns substantial related helpers or nested contracts.
5. Keep `packages/types` dependency-free.

---

# Project Structure

Preferred structure:

```text
packages/types/src/
  index.ts
  auth.ts
  account.ts
  user.ts
  common.ts
```

Use domain files such as `auth.ts`, `account.ts`, or `project.ts` when types belong to the same feature or API surface.

Use purpose files such as `common.ts` only for contracts reused across multiple domains, such as pagination, API errors, or shared primitive shapes.

---

# Public Exports

Consumers should import from `@appiary/types` only:

```ts
import type { AuthResponse, LoginRequest } from "@appiary/types";
```

Do not import from deep package paths such as `@appiary/types/dist/auth` or `packages/types/src/auth`.

`src/index.ts` should re-export public contracts from domain files:

```ts
export type { AuthResponse, LoginRequest } from "./auth";
```

---

# File Splitting Rule

Prefer grouped files over individual interface files.

Create a new domain or purpose file when:

- A new feature introduces multiple related request or response contracts.
- An existing file mixes unrelated domains.
- A shared type is reused across domains and no longer belongs to one feature file.

Do not create a separate file for every interface by default. Tiny single-interface files add import churn without improving ownership.

---

# Naming

Use contract-oriented names:

| Type | Pattern |
|------|---------|
| Request | `CreateFooRequest` |
| Response | `FooResponse` |
| Shared view of authenticated principal | `AuthenticatedUser` |
| Shared reusable shape | `Pagination`, `ApiErrorResponse` |

Avoid names tied to persistence or framework internals, such as `FooModel`, `FooEntity`, `ExpressFoo`, or ORM-specific names.

---

# Dependency Rules

- `packages/types` must not import from `packages/api`, `packages/web`, or `packages/e2e`.
- Do not place runtime validation, business logic, framework types, or database models in `packages/types`.
- If runtime validation is needed, keep it in the owning runtime package and export only the shared contract shape here.

---

# Final Rule

If two or more contracts change together because they describe the same API surface, keep them together in one domain file and export them through `index.ts`.
