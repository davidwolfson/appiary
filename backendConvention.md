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

