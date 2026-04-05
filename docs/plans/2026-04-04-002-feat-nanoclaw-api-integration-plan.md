---
title: "feat: NanoClaw API integration — search, auth, and docs"
type: feat
status: completed
date: 2026-04-04
---

# feat: NanoClaw API integration — search, auth, and docs

## Overview

Enable NanoClaw (personal assistant bot) to integrate with Meal Assistant by closing three gaps: (1) add search/filter to the recipe list endpoint, (2) protect recipe CRUD endpoints with the same Bearer token auth used elsewhere, and (3) document the API schema so NanoClaw can map parsed emails to the correct format.

Most of the API surface NanoClaw needs already exists — `GET /api/recipes/:id`, `GET /api/plan/current`, `POST /api/recipes`, and `POST /api/generate-plan` are all implemented. The webhook (nice-to-have in the issue) is out of scope; NanoClaw can poll `/api/plan/current` after the Sunday cron.

## Problem Frame

NanoClaw needs to POST parsed recipes from email, query the recipe library ("what can I make with chicken?"), and fetch the weekly plan to push to WhatsApp. The API endpoints exist but `GET /api/recipes` returns all recipes with no search/filter, recipe CRUD has no auth (anyone could create/delete recipes), and there's no documented schema for external consumers.

Related: dancj/meal-assistant#41

## Requirements Trace

- R1. `GET /api/recipes` supports search by name (`?q=chicken`) and filter by tag (`?tag=vegetarian`)
- R2. All recipe CRUD endpoints (`GET`, `POST`, `PUT`, `DELETE /api/recipes`) require Bearer token auth with `CRON_SECRET` (matching the existing pattern on `generate-plan` and `plan/current`)
- R3. Recipe POST/PUT schema is documented in a machine-readable way (API docs file or inline OpenAPI-style comments) so NanoClaw can map parsed emails correctly
- R4. Existing UI functionality continues to work — the web UI calls these endpoints without auth tokens, so auth must be opt-in (skipped when `CRON_SECRET` is empty)
- R5. All existing tests continue to pass

## Scope Boundaries

- No webhook/callback after plan generation — NanoClaw will poll `/api/plan/current`
- No pagination on recipe list — the dataset is household-scale (tens to low hundreds of recipes)
- No new endpoints — all needed routes already exist
- No changes to the generate-plan or plan/current endpoints — they already have auth and work correctly
- No API versioning — single consumer (NanoClaw), direct coordination
- Field naming stays as-is (`prep_time`, `cook_time`, `source_url` with underscores) — NanoClaw adapts to the schema, not the other way around

## Context & Research

### Relevant Code and Patterns

- **Auth pattern:** Inline Bearer token check in `src/app/api/plan/current/route.ts` and `src/app/api/generate-plan/route.ts` — skips auth if `CRON_SECRET` is empty
- **Recipe routes:** `src/app/api/recipes/route.ts` (GET list, POST create) and `src/app/api/recipes/[id]/route.ts` (GET by id, PUT update, DELETE)
- **Storage interface:** `src/lib/storage/types.ts` — `RecipeRepository.list()` takes no parameters
- **SQLite implementation:** `src/lib/storage/sqlite.ts` — `list()` runs `SELECT * FROM recipes ORDER BY created_at DESC`
- **Supabase implementation:** `src/lib/storage/supabase.ts` — same pattern
- **Recipe validation:** `src/lib/recipe-validation.ts` — `validateRecipeBody()` and `pickRecipeFields()`
- **Recipe type:** `src/types/recipe.ts` — `Recipe` and `Ingredient` interfaces
- **Existing tests:** `src/app/api/recipes/route.test.ts` and `src/app/api/recipes/[id]/route.test.ts`

### Issue field naming mismatch

The issue uses camelCase (`prepTime`, `cookTime`, `title`, `source`) but the actual codebase uses `prep_time`, `cook_time`, `name`, `source_url`. The API docs must reflect the actual schema, not the issue's approximation.

## Key Technical Decisions

- **Extract auth into a shared helper** rather than copy-pasting the inline check into 4 more route handlers. Create a small `requireAuth(request)` function in `src/lib/auth.ts` that returns `null` on success or a 401 `NextResponse` on failure. This reduces duplication and ensures consistent behavior (skip when `CRON_SECRET` empty, Bearer scheme only).

- **Add `search()` method to RecipeRepository** rather than filtering in the route handler. The storage layer should handle search so both SQLite and Supabase can use their native query capabilities (SQLite `LIKE`, Supabase `ilike`). This keeps the route handler thin and the storage abstraction clean.

- **API docs as a Markdown file** (`docs/api.md`) rather than OpenAPI/Swagger. The only consumer is NanoClaw — a lightweight doc with request/response examples is more useful than a formal spec. Include curl examples for each endpoint.

## Open Questions

### Resolved During Planning

- **Should the UI break when auth is added to recipe endpoints?** No — auth is already opt-in. When `CRON_SECRET` is empty (local dev, demo mode), auth is skipped. The UI doesn't send auth headers, so this works seamlessly.
- **Should search be full-text or simple LIKE?** Simple case-insensitive LIKE on recipe name. Full-text search is overkill for a household recipe library.
- **Should tag filter support multiple tags?** Single tag filter for now (`?tag=vegetarian`). Multiple tags can be added later if NanoClaw needs it.

### Deferred to Implementation

- Exact SQL query shape for search + tag filter combination (AND logic vs separate queries)
- Whether Supabase's `ilike` or `textSearch` is the right primitive

## Implementation Units

- [x] **Unit 1: Extract shared auth helper**

**Goal:** Create a reusable auth check function to eliminate duplication across route handlers.

**Requirements:** R2, R4

**Dependencies:** None

**Files:**
- Create: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`
- Modify: `src/app/api/plan/current/route.ts` (refactor to use shared helper)
- Modify: `src/app/api/generate-plan/route.ts` (refactor to use shared helper)

**Approach:**
- Extract the inline auth pattern into a function that takes a `Request` and returns either `null` (success) or a 401 `NextResponse`
- Refactor the two existing route handlers that already have auth to use the new helper
- Behavior is identical: skip auth when `CRON_SECRET` is empty, Bearer scheme only

**Patterns to follow:**
- Existing inline auth in `src/app/api/plan/current/route.ts` lines 7-17

**Test scenarios:**
- Happy path: Valid Bearer token → returns null (auth passes)
- Happy path: CRON_SECRET not set → returns null (auth skipped)
- Error path: Missing Authorization header → returns 401 response
- Error path: Wrong token → returns 401 response
- Error path: Malformed header (no "Bearer " prefix) → returns 401 response
- Edge case: Empty string token vs empty CRON_SECRET → auth skipped (CRON_SECRET is falsy)

**Verification:**
- Existing tests for `plan/current` and `generate-plan` routes still pass
- Auth behavior is identical before and after refactor

- [x] **Unit 2: Add auth to recipe CRUD endpoints**

**Goal:** Protect recipe endpoints with Bearer token auth using the shared helper.

**Requirements:** R2, R4

**Dependencies:** Unit 1

**Files:**
- Modify: `src/app/api/recipes/route.ts`
- Modify: `src/app/api/recipes/[id]/route.ts`
- Modify: `src/app/api/recipes/route.test.ts`
- Modify: `src/app/api/recipes/[id]/route.test.ts`

**Approach:**
- Import the shared auth helper and call it at the top of each handler (GET, POST, PUT, DELETE)
- Return early with the 401 response if auth fails
- Update existing tests: they currently call endpoints without auth. Either set `CRON_SECRET` to empty in test env (to skip auth) or add the Bearer header to test requests

**Patterns to follow:**
- Refactored auth usage from Unit 1 in `src/app/api/plan/current/route.ts`

**Test scenarios:**
- Happy path: GET /api/recipes with valid token → 200 with recipes
- Happy path: POST /api/recipes with valid token and valid body → 201
- Happy path: All endpoints with CRON_SECRET unset → auth skipped, normal behavior
- Error path: GET /api/recipes with wrong token → 401
- Error path: POST /api/recipes without Authorization header → 401
- Error path: DELETE /api/recipes/:id with invalid token → 401

**Verification:**
- All existing recipe route tests pass (updated with auth)
- Endpoints return 401 when CRON_SECRET is set and token is missing/wrong
- Endpoints work normally when CRON_SECRET is empty

- [x] **Unit 3: Add search and tag filter to recipe list**

**Goal:** Enable `GET /api/recipes?q=chicken&tag=dinner` to filter recipes by name and tag.

**Requirements:** R1

**Dependencies:** Unit 2 (auth is in place)

**Files:**
- Modify: `src/lib/storage/types.ts` (add `search` method to `RecipeRepository`)
- Modify: `src/lib/storage/sqlite.ts` (implement search)
- Modify: `src/lib/storage/supabase.ts` (implement search)
- Modify: `src/app/api/recipes/route.ts` (parse query params, call search)
- Modify: `src/app/api/recipes/route.test.ts`

**Approach:**
- Add `search(query?: { q?: string; tag?: string }): Promise<Recipe[]>` to `RecipeRepository` interface
- SQLite: Use `WHERE name LIKE '%query%' COLLATE NOCASE` for name search, `AND tags LIKE '%tag%'` for tag filter (tags stored as JSON array text)
- Supabase: Use `.ilike('name', '%query%')` for name search, `.contains('tags', [tag])` for tag filter
- Route handler: Parse `q` and `tag` from URL search params. If neither present, call `list()` as before. If either present, call `search()`
- Keep `list()` unchanged — `search()` is additive

**Patterns to follow:**
- Existing `RecipeRepository` interface in `src/lib/storage/types.ts`
- SQLite query patterns in `src/lib/storage/sqlite.ts`
- Supabase query patterns in `src/lib/storage/supabase.ts`

**Test scenarios:**
- Happy path: `GET /api/recipes?q=chicken` → returns only recipes with "chicken" in name (case-insensitive)
- Happy path: `GET /api/recipes?tag=dinner` → returns only recipes tagged "dinner"
- Happy path: `GET /api/recipes?q=pasta&tag=quick` → returns recipes matching both criteria
- Happy path: `GET /api/recipes` (no params) → returns all recipes (unchanged behavior)
- Edge case: `GET /api/recipes?q=` (empty query) → returns all recipes
- Edge case: `GET /api/recipes?q=nonexistent` → returns empty array, not 404
- Edge case: `GET /api/recipes?tag=DINNER` → case-insensitive tag matching

**Verification:**
- Search by name returns correct subset
- Tag filter returns correct subset
- Combined query + tag returns intersection
- Existing tests for unfiltered list still pass
- Both SQLite and Supabase implementations work

- [x] **Unit 4: Create API documentation**

**Goal:** Document the full API surface for NanoClaw integration.

**Requirements:** R3

**Dependencies:** Units 1-3 (document the final API shape)

**Files:**
- Create: `docs/api.md`

**Approach:**
- Document each endpoint: method, path, auth requirements, request body schema, response schema, example curl commands
- Include the exact field names the codebase uses (`name` not `title`, `prep_time` not `prepTime`, `source_url` not `source`)
- Include the `Ingredient` schema (`{ name, quantity, unit }`)
- Note that auth is optional when `CRON_SECRET` is not configured
- Include error response format (`{ error: string }`)

**Test expectation:** none — documentation only.

**Verification:**
- `docs/api.md` exists and covers all endpoints
- Field names match the actual TypeScript types in `src/types/recipe.ts`
- Curl examples are correct and testable

## System-Wide Impact

- **Interaction graph:** Auth helper is called by all API route handlers. Changing auth behavior affects all endpoints simultaneously — this is intentional (single `CRON_SECRET` controls everything).
- **Error propagation:** Auth failures return 401 before any business logic runs. No change to existing error patterns within route handlers.
- **State lifecycle risks:** None — search is read-only, auth is stateless.
- **API surface parity:** The web UI calls recipe endpoints without auth headers. When `CRON_SECRET` is empty (dev/demo), this works. When `CRON_SECRET` is set (production), the UI's recipe list page will get 401s. This is acceptable because the UI is not the primary consumer in production — NanoClaw is. If the UI needs to work with auth enabled, a future change could exempt GET requests or add a session-based auth flow.
- **Unchanged invariants:** `POST /api/generate-plan`, `GET /api/plan/current`, recipe data model, email delivery, GitHub Actions cron — all unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| UI breaks when CRON_SECRET is set in production | Auth is skipped when CRON_SECRET is empty. In production with CRON_SECRET set, the UI recipe list will 401. This is a known tradeoff — the UI is secondary to NanoClaw in production. Document in api.md. |
| SQLite tag search is imprecise (LIKE on JSON text) | Tags are stored as JSON arrays. `LIKE '%dinner%'` could false-match "dinner-party". Use JSON extraction if available in better-sqlite3, or accept the edge case for household-scale data. |
| Search on large recipe sets is slow | Not a concern at household scale (tens to low hundreds). No index needed. |

## Sources & References

- Related issue: dancj/meal-assistant#41
- Auth pattern: `src/app/api/plan/current/route.ts`
- Storage interface: `src/lib/storage/types.ts`
- Recipe type: `src/types/recipe.ts`
- Existing route tests: `src/app/api/recipes/route.test.ts`, `src/app/api/recipes/[id]/route.test.ts`
