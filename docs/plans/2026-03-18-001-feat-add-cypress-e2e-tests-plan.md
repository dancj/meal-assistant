---
title: "feat: Add Cypress E2E tests"
type: feat
status: completed
date: 2026-03-18
---

# feat: Add Cypress E2E tests

## Overview

Add Cypress end-to-end tests covering the recipe management UI flows. Tests use `cy.intercept()` to stub all `/api/*` responses, making them runnable without API keys or external services. This complements the existing Vitest unit/integration tests which cover API route logic and pure functions.

## Problem Statement / Motivation

The app has solid unit test coverage (74 tests via Vitest) for API routes, email formatting, and validation logic, but zero browser-level testing. The recipe management UI (list, create, edit, delete, search, filter) has no automated verification that the pages render correctly, forms submit properly, navigation works, and user flows complete end-to-end.

## Proposed Solution

Install Cypress and write E2E specs for the core recipe management flows using `cy.intercept()` to mock API responses. Add a CI workflow to run Cypress on PRs.

### Mocking Strategy: `cy.intercept()`

All `/api/*` calls are stubbed at the network level using Cypress fixtures. This means:

- Tests run without Supabase, Gemini, or Resend credentials
- Tests are fast and deterministic (no real database state to manage)
- API route logic is already covered by Vitest — Cypress focuses on UI behavior
- No seeding/teardown complexity

### Selector Strategy: `data-testid` attributes

Add `data-testid` attributes to key interactive elements in the UI components. Convention: `data-testid="kebab-case-name"` (e.g., `recipe-list-item`, `search-input`, `add-ingredient-btn`).

## Technical Considerations

- **Next.js 15 + App Router**: Cypress needs the dev server running. Use `start-server-and-test` to start `next dev` before Cypress runs.
- **TypeScript**: Add `cypress/tsconfig.json` extending the base config.
- **Recipe UI branch**: The UI exists on `feat/recipe-management-ui` and should be merged before or alongside this work. E2E tests target those pages.
- **Existing test setup**: Vitest and Cypress coexist fine — Vitest handles `src/**/*.test.ts`, Cypress handles `cypress/e2e/**/*.cy.ts`.

## Acceptance Criteria

### Setup

- [ ] Install `cypress` and `start-server-and-test` as dev dependencies
- [ ] Create `cypress.config.ts` with `baseUrl: "http://localhost:3000"`, TypeScript support, screenshots on failure, no video
- [ ] Create `cypress/tsconfig.json` for Cypress-specific TypeScript config
- [ ] Create `cypress/support/e2e.ts` with any global setup
- [ ] Add scripts to `package.json`: `cypress:open`, `cypress:run`, `e2e`
- [ ] Add `cypress/videos`, `cypress/screenshots`, `cypress/downloads` to `.gitignore`

### Fixtures

- [ ] Create `cypress/fixtures/recipes.json` — array of 6+ recipe objects matching the `Recipe` type (varied tags, ingredient counts, optional fields)
- [ ] Create `cypress/fixtures/recipe-single.json` — a single recipe for detail/edit views
- [ ] Create `cypress/fixtures/empty-recipes.json` — empty array for empty state testing

### E2E Specs

#### `cypress/e2e/recipe-list.cy.ts` — Recipe list page

- [ ] Displays list of recipes fetched from API
- [ ] Shows empty state when no recipes exist
- [ ] Search input filters recipes by name (client-side)
- [ ] Tag chips filter recipes by tag
- [ ] Combined search + tag filter works
- [ ] Clearing search/filter restores full list
- [ ] Clicking a recipe navigates to detail page

#### `cypress/e2e/recipe-create.cy.ts` — Create recipe flow

- [ ] Navigates to `/recipes/new` via UI link
- [ ] Fills in recipe name, servings, tags, instructions
- [ ] Adds multiple ingredient rows dynamically
- [ ] Removes an ingredient row
- [ ] Submits form and verifies redirect to recipe list
- [ ] Shows validation error when name is empty
- [ ] Shows validation error when no ingredients have names

#### `cypress/e2e/recipe-detail.cy.ts` — Recipe detail page

- [ ] Displays recipe name, tags, servings, ingredients, instructions
- [ ] Edit button navigates to edit page
- [ ] Delete button shows `window.confirm()` dialog
- [ ] Confirming delete calls `DELETE /api/recipes/[id]` and redirects to list
- [ ] Canceling delete stays on detail page

#### `cypress/e2e/recipe-edit.cy.ts` — Edit recipe flow

- [ ] Form is pre-populated with existing recipe data
- [ ] Modifying fields and submitting calls `PUT /api/recipes/[id]`
- [ ] Redirects to detail page after successful edit
- [ ] Validation errors work the same as create

### UI Changes (add `data-testid` attributes)

- [ ] `RecipeList.tsx` — `search-input`, `tag-filter-{tag}`, `recipe-list-item`, `empty-state`
- [ ] `RecipeForm.tsx` — `recipe-name-input`, `recipe-servings-input`, `ingredient-row`, `add-ingredient-btn`, `remove-ingredient-btn`, `submit-btn`
- [ ] `DeleteButton.tsx` — `delete-btn`
- [ ] Recipe detail page — `recipe-detail`, `edit-btn`
- [ ] Recipe list page — `add-recipe-link`

### CI

- [ ] Create `.github/workflows/cypress.yml`:
  - Triggers on `push` and `pull_request` to `main`
  - Installs dependencies, builds the app, runs Cypress against `next start`
  - Uploads screenshots as artifacts on failure
  - Uses `cypress-io/github-action` for caching and server management

## File Structure

```
cypress/
  e2e/
    recipe-list.cy.ts
    recipe-create.cy.ts
    recipe-detail.cy.ts
    recipe-edit.cy.ts
  fixtures/
    recipes.json
    recipe-single.json
    empty-recipes.json
  support/
    e2e.ts
    commands.ts
  tsconfig.json
cypress.config.ts
.github/workflows/cypress.yml
```

## What NOT to E2E Test (leave to Vitest)

- API route error handling (400, 404, 500 branches) — already covered
- `POST /api/generate-plan` — no UI, requires auth + 3 external services
- Email formatting and parsing — pure functions, already tested
- Recipe validation logic — pure function, already tested
- Date calculations, field allowlisting — pure functions

## Dependencies & Risks

- **Depends on**: Recipe management UI being merged (`feat/recipe-management-ui` branch / PR #17)
- **Risk**: `cy.intercept()` tests don't catch real API integration issues — acceptable since API routes have Vitest coverage
- **Risk**: `data-testid` additions require modifying UI components — low risk, additive-only changes

## Success Metrics

- All E2E specs pass locally and in CI without any API keys configured
- Core recipe CRUD flows are covered end-to-end
- CI runs complete in under 2 minutes

## Sources & References

- Existing test setup: `vitest.config.ts`, `src/test/setup.ts`, `src/test/helpers.ts`
- UI components (on `feat/recipe-management-ui`): `src/components/RecipeForm.tsx`, `src/components/RecipeList.tsx`, `src/components/DeleteButton.tsx`
- API routes: `src/app/api/recipes/route.ts`, `src/app/api/recipes/[id]/route.ts`
- Related issues: #5 (Recipe management web UI)
