# Playwright E2E Conventions

## Purpose

This document defines the conventions for the `packages/e2e` Playwright suite.

It is intended for both human developers and agents adding or modifying end-to-end tests so the suite stays consistent as coverage expands.

---

# Scope

The E2E package covers browser-driven user flows in the running application.

It should verify:
- User-visible behavior
- Navigation and route protection
- Form validation behavior
- Request/response handling as experienced through the UI
- Loading and error states

It should not become:
- A duplicate API test suite
- A unit test suite for component internals
- A place for feature-specific one-off patterns when a shared helper or page abstraction is more appropriate

---

# Current Package Structure

```text
/packages/e2e
  /helpers
    auth.ts
    routes.ts
    test-data.ts
  /pages
    home-page.ts
    login-page.ts
    register-page.ts
  /tests
    /auth
      login.spec.ts
      register.spec.ts
      auth-tests.md
  package.json
  playwright.config.ts
  README.md
```

## Folder Responsibilities

- `helpers/`: shared test utilities, route constants, auth setup, and reusable test data factories
- `pages/`: page-object factories that expose stable locators and high-level page actions
- `tests/`: feature-grouped specs
- `tests/<feature>/<feature>-tests.md`: optional behavior inventory or coverage checklist for that feature

---

# Core Principles

1. Test behavior through the UI, not implementation details
2. Keep specs readable enough to scan as behavior documentation
3. Reuse helpers and page objects instead of duplicating selectors or setup logic
4. Keep assertions close to the behavior they verify
5. Prefer accessible selectors (`getByRole`, `getByLabel`, visible text) over brittle CSS selectors
6. Keep each helper and page object narrowly focused
7. Add shared abstractions only when at least two tests benefit from them or when a single flow would otherwise become noisy

---

# Playwright Config Conventions

The suite currently uses:
- `testDir: "./tests"`
- `fullyParallel: true`
- `chromium` for full mocked and real-API coverage
- Firefox Desktop, WebKit Desktop Safari, and Pixel 7 Chromium emulation for tagged browser smoke coverage
- Root workspace commands to start the API and web app
- `baseURL` and API health URL from environment variables with localhost defaults
- Trace, screenshot, and video capture for failure debugging

## Rules

- Keep environment-level behavior in `playwright.config.ts`, not in individual specs
- Reuse the existing `baseURL` model rather than hardcoding full URLs in tests
- Prefer route-relative navigation like `page.goto(routes.login)` through page objects
- If a new feature needs extra shared setup, first decide whether it belongs in config, a helper, or a page object
- Always pin full mocked, real-API, headed, and UI commands to `chromium`; adding a project must not multiply those suites
- Secondary projects must require `@browser-smoke` and exclude `@real-api` in both configuration and the invoking command

## Accessibility policy

- Stable guest, dashboard, and major dialog states run Axe in the required mocked Chromium lane
- Confirmed violations from cumulative WCAG 2.0, 2.1, and 2.2 Level A/AA tags fail regardless of impact
- Attach normalized violation and incomplete-check JSON to each Playwright result
- Treat incomplete checks as manual-review evidence, not confirmed violations
- Do not introduce permanent baselines, blanket selector exclusions, or broad rule disables
- Any verified false-positive exception must be narrow, documented, and tied to a follow-up issue

---

# Helper Conventions

Helpers live in `packages/e2e/helpers` and should own shared setup that is not specific to one page.

## What Belongs in Helpers

- Route constants
- Shared test-data factories
- Authentication/session bootstrapping
- Request mocking utilities that are reused across specs
- Cross-feature browser setup logic

## What Does Not Belong in Helpers

- Page-specific selectors
- Page-specific assertions about visible UI
- Large feature workflows that are only used by one spec file

## Current Helper Patterns

### `routes.ts`

- Expose a single `routes` constant
- Keep route strings centralized
- Add new route constants before introducing raw path strings in specs or page objects

### `test-data.ts`

- Use factory functions such as `createRegistrationInput()`
- Return valid-by-default data
- Allow tests to override only the field relevant to the scenario
- Prefer generated unique values when collisions are possible

### `auth.ts`

- Use shared helpers for authenticated session setup
- Use dedicated request-mocking helpers that both intercept the request and capture submitted payloads
- Return captured request arrays so specs can assert on what the UI submitted

## Rules

- Keep helper APIs small and explicit
- Name helpers by outcome, not implementation detail
- Prefer typed function inputs and outputs using shared types from `@appiary/types`
- Put reusable mock/intercept behavior in helpers once more than one spec needs it
- Do not hide critical assertions inside helpers unless the helper is explicitly an `expect...` helper

---

# Page Object Conventions

Pages live in `packages/e2e/pages` and currently follow a factory pattern such as `createLoginPage(page)`.

## Page Object Responsibilities

- Define stable locators once
- Expose high-level actions such as `goto()`, `fillForm()`, `submit()`
- Expose page-level assertions such as `expectVisible()`
- Encapsulate the route used to reach that page

## Preferred Pattern

```ts
export function createExamplePage(page: Page) {
  const heading = page.getByRole("heading", { name: "Example" });
  const submitButton = page.getByRole("button", { name: "Submit" });

  return {
    heading,
    submitButton,
    async goto(): Promise<void> {
      await page.goto(routes.example);
    },
    async expectVisible(): Promise<void> {
      await expect(heading).toBeVisible();
      await expect(submitButton).toBeVisible();
    },
    async submit(): Promise<void> {
      await submitButton.click();
    },
  };
}
```

## Locator Rules

- Prefer `getByRole` for buttons, headings, links, alerts, and other semantic elements
- Prefer `getByLabel` for form fields
- Use visible text only when role/label selectors are not appropriate
- Avoid CSS selectors and DOM structure selectors unless there is no stable accessible alternative

## Assertion Rules

- Put page-shape assertions in page objects when they are reused or define the screen contract
- Keep scenario-specific assertions in the spec
- Use explicit `expectVisible()`-style methods for page readiness instead of duplicating the same assertions in multiple tests

## Action Rules

- Expose actions at the level a spec reads cleanly
- Keep `fillForm()` helpers typed with request DTOs when the form maps directly to a shared request shape
- Add direct field access only when a test truly needs field-level interaction outside the standard path

## Naming Rules

- File name: `<feature>-page.ts`
- Factory name: `create<Feature>Page`
- Assertion methods: `expect...`
- Navigation methods: `goto()`, `goTo...()`
- Form actions: `fillForm()`, `submit()`

---

# Spec Conventions

Specs live in `packages/e2e/tests/<feature>` and should be grouped by user-facing area, not by implementation layer.

## File Placement

- Put tests under `tests/<feature>`
- Use one spec file per page or major flow when practical
- Keep related cross-page flows in the same feature folder

## Describe and Test Naming

- Wrap related tests in `test.describe("<feature>", () => {})`
- Use sentence-style test names that describe observable behavior

Examples:
- `renders the login form for guests`
- `redirects authenticated users away from the register page`
- `shows a loading state while the login request is pending`

Use `@real-api` only for journeys that exercise the live Express/PostgreSQL boundary. Use `@browser-smoke` only for the two representative, route-mocked compatibility journeys. The scheduled/manual browser lane must remain selective; Pixel 7 coverage is emulation rather than physical-device validation.

## Scenario Structure

Every test must separate its scenario with `// given`, `// when`, and `// then` comments:

```ts
// given I am on the login page
await loginPage.goto();

// when I enter valid credentials and submit the form
await loginPage.fillForm(loginInput);
await loginPage.submit();

// then I should be redirected to / and see the home screen
await expect(page).toHaveURL(/\/$/);
await homePage.expectSignedIn(user);
```

## Rules

- Keep phases monotonic: all `given` sections come before every `when` section, and all `when` sections come before every `then` section
- Multiple comments within the same phase are allowed when they keep setup, actions, or outcomes clear
- Each comment must name the relevant setup, action, or outcome; generic labels such as `given the test context`, `when the behavior is exercised`, or `then the expected outcome is observed` are not acceptable
- Never return to `given` or `when` after assertions under `then` have begun; split the later action and its outcome into another test
- For example, `given → when → then → when → then` is invalid and must be two tests
- Keep one primary behavior under test per test case
- Instantiate page objects near the top of the test
- Keep setup, action, and assertions in clear order
- Assert on both network behavior and UI outcome when both are part of the contract
- Use `expect.poll()` when waiting for intercepted request arrays to update
- Prefer `toHaveURL(...)` over manual URL string reads
- Stay on route-based assertions for validation failures and redirect checks

---

# Request Mocking Conventions

This suite currently favors Playwright route interception for auth flows.

## Rules

- Mock UI-triggered API requests at the network boundary with `page.route(...)`
- Capture submitted payloads so the spec can assert on request contents
- Fulfill with realistic JSON response shapes using shared types or helper factories
- Use `route.abort()` only when the expected behavior is that no request should be sent
- For pending-request/loading-state tests, gate fulfillment behind a promise and release it explicitly from the test

## Preferred Patterns

- Success path: assert request payload and resulting navigation/UI
- Validation path: assert no request was sent and the user remains on the current route
- API failure path: fulfill a non-2xx response and assert alert/error behavior
- Pending path: hold the route open, assert loading UI, then release it

---

# Test Data Conventions

## Rules

- Prefer valid-by-default factories
- Override only the field needed for the specific scenario
- Keep literal values simple and readable
- Use shared DTO shapes from `@appiary/types` when the form/request contract already exists there
- Generate unique data where collisions would make tests flaky

## Examples

- Valid baseline registration input from `createRegistrationInput()`
- Inline invalid email overrides for validation scenarios
- Inline too-short or mismatched passwords when that detail is the behavior under test

---

# Coverage Expectations For New Features

When adding E2E coverage for a new page or feature, prefer covering the same behavioral categories already present in auth:

1. Page renders for the intended visitor state
2. Protected/redirect behavior is enforced
3. Client-side validation blocks invalid submission
4. Valid submission sends the expected request
5. Success state navigates or updates the UI correctly
6. Pending requests show loading/disabled states
7. API failures surface the correct error feedback
8. Important cross-links/navigation paths work

Not every feature needs every category, but omitting one should be a deliberate decision.

---

# Adding New Tests

For a new feature:

1. Add any missing route constants to `helpers/routes.ts`
2. Add or extend test-data factories if the feature needs reusable valid input
3. Create or extend a page object in `pages/`
4. Add a feature-folder spec in `tests/<feature>/`
5. Add shared request-mocking helpers if multiple tests need the same interception pattern
6. Optionally add or update a `<feature>-tests.md` checklist if the feature has a broader test matrix

## Prefer Extending Existing Files When

- A helper is the obvious shared home for new route/auth/data behavior
- A page object already represents the page being tested
- A spec file already owns the same page or flow

## Prefer New Files When

- A new page introduces its own selectors and actions
- A new feature folder makes the suite easier to scan
- A helper would otherwise become a mixed-responsibility dumping ground

---

# Anti-Patterns

Avoid the following:

- Repeating raw selectors across multiple specs
- Hardcoding route strings in tests when `routes.ts` should own them
- Putting feature-specific selectors into shared helpers
- Hiding whole user flows inside generic helpers that make specs unreadable
- Writing assertions against framework internals unless that state is the actual contract being tested
- Overusing `waitForTimeout`
- Mixing unrelated behaviors into one test case
- Building abstractions before a second use case exists

---

# Review Checklist

Before merging E2E changes, check that:

- The spec is placed under the correct feature folder
- The test name describes user-visible behavior
- The test uses page objects instead of duplicating selectors
- Shared routes and reusable data live in helpers
- The test follows Given/When/Then comment structure
- Assertions cover both the important UI result and the relevant request behavior
- New abstractions are justified by reuse or readability
- The test remains readable without needing to inspect implementation details

---

# Final Rule

Optimize for readable behavioral specs backed by small, typed helpers and page objects. If a future E2E addition makes the suite harder to scan, harder to reuse, or more coupled to DOM internals, it is probably off-pattern.
