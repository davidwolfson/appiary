# Express Backend Conventions (AI Agent Guide)

## Purpose

This document defines strict conventions for building and modifying the backend using:
- Express.js
- TypeScript
- Zod (runtime validation)

These rules are optimized for **AI agents** and **human developers** to produce consistent, predictable, and maintainable code.

---

# Core Principles

1. **Controllers are thin**
2. **Services contain all business logic**
3. **Types are shared across frontend and backend**
4. **Validation is explicit and runtime-enforced (Zod)**
5. **Clear separation of layers — no leakage**

---

# Project Structure

```
/src
  /controllers
  /services
  /repositories
  /models
  /schemas        (Zod schemas)
  /types          (shared DTOs)
  /utils
```

If using a monorepo:

```
/packages
  /api
  /web
  /types
```

---

# Controllers

## Responsibilities

- Parse and validate request input
- Call a service method
- Return a response

## Rules

- NO business logic
- NO database access
- NO entity construction
- NO multi-step orchestration

## Pattern

```ts
router.post("/foo", async (req, res) => {
  const input = CreateFooSchema.parse(req.body);

  const result = await fooService.create(input);

  res.json(mapToFooResponse(result));
});
```

## Notes

- Always validate using Zod (`.parse` or `.safeParse`)
- Keep handlers short and readable
- Prefer one-liners where possible

---

# Services

## Responsibilities

- All business logic
- Validation beyond shape (business rules)
- Entity creation and mutation
- Cross-service orchestration

## Rules

- Accept **scalars or Action objects**, not raw request objects
- NEVER depend on Express or HTTP concepts
- NEVER return raw database models directly

## Pattern

```ts
export class FooService {
  constructor(private repo: FooRepository) {}

  async create(action: CreateFooAction): Promise<FooResult> {
    // business logic
    const entity = await this.repo.create({
      fooId: action.fooId,
      name: action.name,
    });

    return {
      id: entity.id,
      name: entity.name,
    };
  }
}
```

---

# DTOs (Types)

All shared types live in `/types`.

## Categories

### Request Types

Used by frontend + backend input

```ts
export interface CreateFooRequest {
  fooId: number;
  name: string;
}
```

### Response Types

Returned to frontend

```ts
export interface FooResponse {
  id: number;
  name: string;
}
```

### Action Types (Service Input)

```ts
export interface CreateFooAction {
  fooId: number;
  name: string;
}
```

### Result Types (Service Output)

```ts
export interface FooResult {
  id: number;
  name: string;
}
```

---

# Zod Schemas (Runtime Validation)

All schemas live in `/schemas`.

## Rules

- Every request MUST have a Zod schema
- Schema is the **source of truth** for validation
- Types should be inferred from schemas when possible

## Example

```ts
import { z } from "zod";

export const CreateFooSchema = z.object({
  fooId: z.number(),
  name: z.string().min(1),
});

export type CreateFooRequest = z.infer<typeof CreateFooSchema>;
```

---

# Mapping Layer

Mapping is explicit and lives in controller or dedicated mapper files.

## Example

```ts
export function mapToFooResponse(result: FooResult): FooResponse {
  return {
    id: result.id,
    name: result.name,
  };
}
```

---

# Repositories

## Responsibilities

- Database access only

## Rules

- No business logic
- No cross-entity orchestration
- Return database models only

---

# Data Flow

```
Request (HTTP)
   ↓
Zod Schema Validation
   ↓
Controller
   ↓
Service (Action)
   ↓
Repository / DB
   ↓
Service (Result)
   ↓
Controller Mapping
   ↓
Response
```

---

# Error Handling

## Rules

- Use centralized error middleware
- Services throw domain errors
- Controllers do NOT handle business errors directly

---

# Testing Strategy

Test behavior where it lives. Do not choose test targets by file type alone.

## Scenario Structure

Every `*.spec.ts` test must separate its scenario with `// given`, `// when`, and `// then` comments.

- Keep phases monotonic: all `given` sections come before every `when` section, and all `when` sections come before every `then` section.
- Multiple comments within the same phase are allowed when they keep setup, actions, or outcomes clear.
- Each comment must name the relevant setup, action, or outcome. Generic labels such as `given the test context`, `when the behavior is exercised`, or `then the expected outcome is observed` are not acceptable.
- Never return to `given` or `when` after assertions under `then` have begun. Split the later action and its outcome into another test.
- Shared hooks may establish common background state, but test-specific setup belongs under `given`.
- Keep test names brief and describe the observable behavior.

## Direct Tests Required

- Services: always test public behavior, including important success paths, failure paths, branching rules, normalization, and orchestration
- Middleware: test directly when it enforces authentication, authorization, request mutation, error propagation, or other security-sensitive behavior
- Zod schemas: test directly when they enforce meaningful validation rules, refinements, normalization, or contract-critical constraints
- Error middleware: test status mapping and response shape for validation errors, domain errors, and unexpected exceptions

## Prefer Integration Tests

- Controllers and route registration: test through HTTP-style integration tests that exercise request validation, service invocation, middleware, and response contracts together
- Repositories: test against a test database when verifying SQL behavior, joins, transactions, row mapping, uniqueness handling, or revocation/expiry queries
- App wiring: add a small number of integration tests for health endpoints, route mounting, JSON parsing, and error middleware wiring

## Direct Tests Optional

- Database helpers and transaction wrappers: optional when covered clearly through higher-level repository or service tests, but add focused tests if transaction behavior is nontrivial or has failed before
- Environment/config loaders: optional unless path discovery, defaults, parsing, or startup configuration have become a source of defects
- Thin async wrappers or trivial response mappers: optional when they are true pass-through helpers with no meaningful branching

## Indirect Coverage Is Enough When

- The file is a thin bootstrap, type declaration, or pass-through helper with no meaningful decision logic
- A higher-level test already proves the behavior clearly without becoming brittle or redundant

## Rule of Thumb

If a file contains business rules, branching, security checks, validation logic, transformation, side effects, or a database/API contract, test it directly or through the smallest reliable integration boundary.

---

# Naming Conventions

| Type | Pattern |
|------|--------|
| Request | `CreateFooRequest` |
| Response | `FooResponse` |
| Action | `CreateFooAction` |
| Result | `FooResult` |
| Schema | `CreateFooSchema` |
| Service | `FooService` |
| Controller | `foo.controller.ts` |

---

# Anti-Patterns (Forbidden)

- Business logic in controllers
- Returning database models directly
- Skipping validation
- Sharing ORM models with frontend
- Services depending on Express

---

# Summary

This architecture ensures:

- Strong separation of concerns
- Predictable data flow
- Safe runtime validation
- Shared types across frontend and backend

AI agents MUST follow these rules when generating or modifying code.
