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
      foo.component.ts
      foo.store.ts
      foo.service.ts
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

---

# Services (Shared Business Logic)

## Responsibilities

- Shared logic across components
- Data transformation
- Coordination between APIs

## Rules

- NO UI concerns
- Pure TypeScript where possible

---

# API Layer

## Responsibilities

- Mirror backend endpoints
- Perform HTTP calls only

## Rules

- NO business logic
- NO mapping
- NO state

---

# Mapping Layer

Explicit transformation between API responses and UI models.

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
