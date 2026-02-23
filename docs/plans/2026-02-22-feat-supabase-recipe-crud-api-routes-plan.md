---
title: "Set up Supabase + recipe CRUD API routes"
type: feat
status: complete
date: 2026-02-22
origin: docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md
---

# Set up Supabase + recipe CRUD API routes

## Overview

Build the recipe CRUD API routes for the meal planning assistant. This is Phase 2 of the MVP — the Supabase client, TypeScript types, and dependencies are already in place from Phase 1. The work is: create the `recipes` table in Supabase and implement 5 API route handlers across 2 files.

Ref: GitHub issue #2

## Problem Statement / Motivation

Recipes are the foundation of the meal planning pipeline. The `POST /api/generate-plan` endpoint (issue #3) will fetch recipes from Supabase to build meal plans. The recipe management UI (issue #4+) will use these same CRUD endpoints. Nothing downstream works without recipe storage and retrieval.

## Proposed Solution

### Step 0: Create the `recipes` table in Supabase

Run this SQL in the Supabase dashboard (SQL Editor):

```sql
create table recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ingredients jsonb not null default '[]',
  instructions text,
  tags text[] default '{}',
  servings integer,
  prep_time integer,
  cook_time integer,
  source_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

This is a manual step — no migration tooling for MVP. The schema matches the existing `Recipe` type in `src/types/recipe.ts` exactly.

### Step 1: Create `src/app/api/recipes/route.ts`

Two handlers:

**`GET /api/recipes`** — List all recipes
- Query: `supabase.from('recipes').select('*').order('created_at', { ascending: false })`
- Returns: `200` with JSON array of `Recipe[]` (empty array `[]` if no recipes)
- On Supabase error: `500` with `{ error: "Failed to fetch recipes" }`

**`POST /api/recipes`** — Create a recipe
- Parse request body with `request.json()` (wrapped in try/catch for malformed JSON → `400`)
- Validate:
  - `name` is a non-empty string
  - `ingredients` is an array with >= 1 item
  - Each ingredient has a non-empty `name` string (`quantity` and `unit` can be empty strings)
- Whitelist known fields before inserting (strip unknown properties to avoid Supabase column errors)
- Insert: `supabase.from('recipes').insert(recipeData).select().single()`
  - **Must chain `.select()`** to get the created row back — without it, `data` is `null`
- Returns: `201` with the created `Recipe` object
- Validation failure: `400` with `{ error: "descriptive message" }`
- On Supabase error: `500` with `{ error: "Failed to create recipe" }`

### Step 2: Create `src/app/api/recipes/[id]/route.ts`

Three handlers:

**`GET /api/recipes/[id]`** — Get a single recipe
- Validate `id` is a valid UUID format (regex check → `400` if invalid)
- Query: `supabase.from('recipes').select('*').eq('id', id).single()`
- Returns: `200` with `Recipe` object
- Not found: `404` with `{ error: "Recipe not found" }`

**`PUT /api/recipes/[id]`** — Update a recipe (full replacement)
- Validate `id` is a valid UUID format
- Parse and validate body (same rules as POST — `name` and `ingredients` required)
- Whitelist known fields, add `updated_at: new Date().toISOString()`
  - **The `updated_at` column does NOT auto-update** — the API route must set it explicitly on every PUT
- Update: `supabase.from('recipes').update(recipeData).eq('id', id).select().single()`
- Returns: `200` with the updated `Recipe` object
- Not found: `404` with `{ error: "Recipe not found" }`
- Validation failure: `400` with `{ error: "descriptive message" }`

**`DELETE /api/recipes/[id]`** — Delete a recipe
- Validate `id` is a valid UUID format
- Delete: `supabase.from('recipes').delete().eq('id', id).select().single()`
  - Chain `.select().single()` to detect whether a row was actually deleted
- Returns: `204` No Content (empty body) on success
- Not found: `404` with `{ error: "Recipe not found" }`

### Implementation Details

**UUID validation helper** (inline in the `[id]` route file):

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

**Field whitelist** (shared between POST and PUT):

```typescript
const RECIPE_FIELDS = [
  'name', 'ingredients', 'instructions', 'tags',
  'servings', 'prep_time', 'cook_time', 'source_url', 'notes'
] as const;
```

Pick only these fields from the request body before passing to Supabase. This prevents column-not-found errors from unknown fields and stops clients from setting `id`, `created_at`, or `updated_at` directly.

**Imports:** Use `@/lib/supabase` and `@/types/recipe` (path alias per CLAUDE.md).

**Error responses:** All errors use the shape `{ error: "message string" }`. Never expose raw Supabase error messages to clients — log them server-side with `console.error`, return a generic message.

**Next.js handles 405 automatically** — no need for a catch-all handler for unsupported HTTP methods.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PUT semantics | Full replacement (not partial/PATCH) | Simpler validation; recipe form sends the full object. Standard REST convention. |
| `updated_at` management | API sets it explicitly | Simpler than a Postgres trigger; keeps logic visible in app code |
| Error shape | `{ error: "message" }` | Simple, consistent; sufficient for MVP |
| DELETE non-existent | Returns 404 | More informative; helps catch wrong-ID bugs |
| Default sort | `created_at DESC` | Newest first; deterministic ordering |
| Field whitelisting | Strip unknown fields | Prevents Supabase column-not-found 500 errors |
| Ingredient validation | Require non-empty `name` only | `quantity`/`unit` can be empty (e.g., "salt") |
| Auth on CRUD | None for MVP | Acceptable for personal tool on unlisted URL (see brainstorm) |
| CORS | Not needed | Only server-side consumers for MVP |
| Duplicate recipe names | Allowed | No UNIQUE constraint; recipe variations are common |

## Technical Considerations

- **Supabase `.select()` chaining**: Required after `.insert()` and `.update()` to get the resulting row back. Without it, `data` is `null`. This is a common Supabase gotcha.
- **`request.json()` can throw**: Must wrap in try/catch. Malformed JSON or empty body → `400`.
- **Service role key**: The existing Supabase client uses the service role key (bypasses RLS). Fine for MVP with no auth, but this means the API has full DB access with no row-level restrictions.
- **No pagination**: `GET /api/recipes` returns all recipes. Fine for a household collection (< 100 recipes). The generate-plan endpoint needs all recipes anyway.

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/recipes/route.ts` | GET (list all), POST (create) |
| `src/app/api/recipes/[id]/route.ts` | GET (by id), PUT (update), DELETE |

**No other files needed.** The Supabase client (`src/lib/supabase.ts`), types (`src/types/recipe.ts`), and dependencies (`@supabase/supabase-js`) are already in place from Phase 1.

## Acceptance Criteria

- [ ] Supabase `recipes` table created with the schema above
- [x] `GET /api/recipes` returns `200` with `Recipe[]` (empty array when no recipes)
- [x] `POST /api/recipes` validates input and returns `201` with the created recipe
- [x] `GET /api/recipes/[id]` returns `200` with a single recipe or `404`
- [x] `PUT /api/recipes/[id]` validates input, sets `updated_at`, returns `200` with updated recipe or `404`
- [x] `DELETE /api/recipes/[id]` returns `204` on success or `404` if not found
- [x] Invalid UUID in `[id]` routes returns `400`
- [x] Malformed JSON body returns `400`
- [x] Missing `name` or empty `ingredients` returns `400` with descriptive message
- [x] Unknown fields in request body are stripped (not passed to Supabase)
- [x] Supabase errors are logged server-side but not exposed to clients
- [x] `npm run build` passes with no TypeScript errors
- [x] `npm run lint` passes

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| `updated_at` not auto-updating | API explicitly sets `updated_at` on PUT |
| Unknown fields causing Supabase errors | Whitelist known fields before insert/update |
| No auth on CRUD endpoints | Accepted for MVP; unlisted URL; document as known limitation |
| Supabase client crash if env vars missing | Existing issue from Phase 1; runtime crash at import time |

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md](docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md) — Key decisions: Supabase over Google Sheets, JSONB for ingredients, recipe schema design
- **MVP plan (Phase 2):** [docs/plans/2026-02-21-feat-meal-assistant-mvp-plan.md](docs/plans/2026-02-21-feat-meal-assistant-mvp-plan.md)
- **GitHub issue:** #2
- **Existing code:** `src/lib/supabase.ts` (client), `src/types/recipe.ts` (types)
