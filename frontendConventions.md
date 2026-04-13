# Angular 21 Frontend Conventions (Monorepo-Aligned)

## Purpose

Defines strict conventions for the `/web` package in a monorepo:

```
/packages
  /api     (Node + Express)
  /web     (Angular 21)
  /types   (shared DTOs)
```

This ensures:
- End-to-end type safety
- Predictable architecture across frontend/backend
- Clean separation of responsibilities
- Minimal duplication

---

# Core Principles

1. Components own UI + local logic
2. Services own shared/business logic
3. Stores manage state and async flows
4. DTOs are shared from `/types`
5. API layer mirrors backend endpoints
6. Mapping is explicit and consistent with backend

---

# Architectural Symmetry (Critical)

| Backend (`/api`) | Frontend (`/web`) |
|----------------|------------------|
| Controller | Component |
| Service | Service |
| DTO (`/types`) | DTO (`/types`) |
| Zod Schema | (Optional) client validation |
| Mapper | Mapper |
| Repository | API layer |

---

# Project Structure (Frontend)

```
/packages/web/src/app
  /core
    /api
    /config
  /features
    /foo
      foo.component.html
      foo.component.ts
      foo.component.spec.ts
      foo.store.ts
      foo.store.spec.ts
      foo.service.ts
      foo.service.spec.ts
      foo.api.ts
      foo.mapper.ts
  /shared
    /ui
    /components
    /utils
```

---

# DTO Usage (Shared Types)

All DTOs MUST come from `/types`.

```ts
import { FooResponse, CreateFooRequest } from '@types';
```

## Rules

- NEVER redefine DTOs in frontend
- NEVER expose backend internal models
- DTOs are the contract between `/api` and `/web`

---

# Components (UI + Local Logic)

## Responsibilities

- UI rendering
- Handling user interaction
- Local (non-reusable) business logic

## Rules

- NO HTTP calls
- NO cross-feature logic
- NO complex async workflows
- MAY include simple logic tied to UI
- ALWAYS keep component templates in a separate `*.component.html` file via `templateUrl`
- ALWAYS include a `*.component.spec.ts` test file for each component

## Extraction Rule

If logic is reused OR becomes complex → move to service

---

# Stores (Signal-Based State Layer)

## Responsibilities

- State management
- Async orchestration
- Interaction with services

## Rules

- Use Angular signals
- No DOM logic
- No direct HTTP
- ALWAYS add a `*.store.spec.ts` file when a store owns state transitions, async flows, error handling, or navigation side effects
- ALWAYS test store public behavior directly instead of relying only on component tests

---

# Services (Shared Business Logic)

## Responsibilities

- Shared logic across components
- Data transformation
- Coordination between APIs

## Rules

- NO UI concerns
- Pure TypeScript where possible
- ALWAYS colocate a `*.service.spec.ts` file with each service
- ALWAYS test service public behavior, including success paths and important failure paths

---

# API Layer

## Responsibilities

- Mirror backend endpoints
- Perform HTTP calls only

## Rules

- NO business logic
- NO mapping
- NO state
- Test directly only when the API wrapper contains behavior beyond thin HTTP delegation

---

# Mapping Layer

Explicit transformation between API responses and UI models.

## Rules

- Test mappers directly when they perform meaningful transformation, normalization, defaulting, null handling, enum conversion, or date parsing
- Trivial pass-through mappers may be covered indirectly, but add direct tests once mapper logic becomes a contract boundary

---

# Routing Guards and Interceptors

## Guards

- ALWAYS test guards directly when they enforce access rules or redirects
- Do not rely only on routed component tests to prove guard behavior

## Interceptors

- ALWAYS test interceptors directly when they mutate requests, handle auth failures, or trigger navigation/session side effects
- Keep interceptor tests focused on request/response behavior rather than component rendering

---

# Testing Strategy

Test behavior where it lives. Do not choose test targets by file type alone.

## Direct Tests Required

- Components: always test rendered behavior and user interaction
- Services: always test public behavior, including important success and failure paths
- Stores: test state transitions, async orchestration, error handling, and side effects directly
- Guards: test access decisions and redirects directly
- Interceptors: test request mutation and response-side effects directly

## Direct Tests Optional

- Mappers: optional only when they are trivial pass-through functions with no meaningful branching or transformation
- Thin API wrappers: optional when they only delegate to `HttpClient` without adding behavior

## Indirect Coverage Is Enough When

- The file is a thin pass-through with no branching, transformation, or side effects
- A higher-level test already exercises the behavior clearly without becoming brittle

## Rule of Thumb

If a file contains branching, transformation, or side effects, test it directly.

---

# Angular 21 Best Practices

## Standalone Components Only

## Signals First (avoid RxJS unless needed)

## Zoneless Change Detection

## New Control Flow Syntax (@if, @for)

## inject() over constructor DI

---

# Error Handling

- API errors → interceptor
- Store → manages error state
- Component → displays error only

---

# Naming Conventions

| Type | Pattern |
|------|--------|
| Component | foo.component.ts |
| Store | foo.store.ts |
| Service | foo.service.ts |
| API | foo.api.ts |
| Mapper | foo.mapper.ts |

---

# Monorepo Rules

## `/types` is the Contract

- Shared between frontend and backend

## Backend-First Development

1. Define Zod schema (backend)
2. Export DTO to `/types`
3. Implement endpoint
4. Consume in frontend

## No Circular Dependencies

- `/web` → can import `/types`
- `/api` → can import `/types`
- `/types` → imports nothing

---

# Summary

- Clean frontend/backend symmetry
- Shared type safety
- Controlled flexibility for component logic
- Scalable architecture

---

## Final Rule

Put logic in the closest layer where it remains simple, but no closer.
