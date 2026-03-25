# 🐝 Registration & Login PRD

## Tech Stack
- Node (LTS) + Express
- Angular (LTS) + Bootstrap 5
- PostgreSQL
- Shared DTOs (TypeScript)

---

## Overview
This document defines the requirements for implementing user authentication, including:
- User Registration
- User Login
- Basic Landing Page
- Logout functionality

Each new registration creates both a **User** and an **Account**.

---

## User Registration

### Requirements
- Fields:
  - Account Name (required, max 255 chars)
  - Email (required, unique)
  - Password (required, min 8 chars)
  - Confirm Password (must match)

### Behavior
- Validate inputs
- Create Account with `accountName`
- Create User linked to Account
- Hash password using bcrypt
- Auto-login user after registration
- Redirect to Landing Page

### Validation
- Account Name:
  - Required
  - Trim whitespace
  - Max 255 chars
- Email:
  - Valid format
  - Unique
- Password:
  - Minimum 8 characters
- Confirm Password:
  - Must match Password

---

## User Login

### Requirements
- Fields:
  - Email
  - Password

### Behavior
- Validate credentials
- Authenticate user
- Redirect to Landing Page

### Errors
- Invalid credentials → "Invalid email or password"

---

## Landing Page

### Requirements
- Requires authentication
- Displays:
  - Welcome message
  - Logout button

### Behavior
- Redirect unauthenticated users to Login

---

## Logout

### Requirements
- Invalidate auth token/session
- Redirect to Login page

---

## Backend Requirements

### Auth Middleware
- Protect routes
- Return 401 if unauthorized

---

## Database Schema

### accounts
- id (UUID, PK)
- name (varchar(255), required)
- created_at
- updated_at

### users
- id (UUID, PK)
- account_id (FK → accounts.id)
- email (unique)
- password_hash
- created_at
- updated_at

---

## API Endpoints

### POST /api/auth/register
Request:
{
  "accountName": "My Apiary",
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}

Response:
- 201 Created
- Returns auth token + user info

---

### POST /api/auth/login
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
- 200 OK
- Returns auth token
- 401 if invalid

---

### POST /api/auth/logout
- Clears session/token

---

### GET /api/auth/me
- Returns authenticated user

---

## Frontend Requirements

### Routes
- /login
- /register
- / (protected)

### Guards
- AuthGuard for protected routes
- Redirect logged-in users away from login/register

---

## Shared DTOs

```ts
export interface RegisterRequest {
  accountName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    accountId: string;
  };
  token: string;
}
```

---

## Definition of Done

- User can register and is auto-logged in
- Account + User are created correctly
- User can log in and log out
- Protected routes enforce authentication
- Validation and error handling implemented
