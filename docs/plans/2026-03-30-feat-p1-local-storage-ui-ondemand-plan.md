# P1 Issues: Local Storage, Recipe UI polish, On-Demand Generation

**Issues:** #42 (local-first storage), #18 (recipe management UI), #6 (on-demand generation trigger)
**Date:** 2026-03-30

## Overview

Three P1 issues that together make the app fully self-contained: run with zero external services, manage recipes through the UI, and trigger meal plan generation on demand. The recipe management UI (#18) already exists — the remaining work is storage abstraction and the generate-plan UI.

## Current State Assessment

- **Recipe CRUD UI exists**: pages at `/recipes/new`, `/recipes/[id]`, `/recipes/[id]/edit` with full form, list, detail, delete
- **Demo mode exists**: `src/lib/demo-mode.ts` has in-memory store that activates when Supabase env vars are missing
- **No meal plan persistence**: generated plans are returned in the API response but never stored
- **No generate-plan UI**: only accessible via API call with Bearer token
- **Supabase coupling is low**: isolated to 3 route files + 1 client file, 5 simple query patterns

## Architecture Decisions

1. **SQLite via `better-sqlite3`** for local storage — persistent, zero-config, works in Next.js API routes
2. **Repository pattern** — `RecipeRepository` and `MealPlanRepository` interfaces, with `SqliteRecipeRepository`, `SupabaseRecipeRepository`, etc.
3. **Auto-select at startup** — if `SUPABASE_URL` is set → Supabase adapters; otherwise → SQLite adapters
4. **Demo mode becomes "local mode"** — the existing demo-mode concept merges into the storage layer; `isDemoMode()` becomes `isLocalMode()` (no Supabase configured)
5. **Meal plans table** — new storage for generated plans, needed by both #42 and #6
6. **Keep it simple** — no ORM, no migration framework, just raw SQL for SQLite and existing Supabase client calls

## Implementation Units

### Unit 1: Storage Abstraction Layer

**Files to create:**
- `src/lib/storage/types.ts` — repository interfaces
- `src/lib/storage/sqlite.ts` — SQLite adapter (recipes + meal plans)
- `src/lib/storage/supabase.ts` — Supabase adapter (move existing queries here)
- `src/lib/storage/index.ts` — factory that returns the right adapter based on env

**Files to modify:**
- `src/app/api/recipes/route.ts` — use repository instead of direct Supabase/demoStore calls
- `src/app/api/recipes/[id]/route.ts` — same
- `src/app/api/generate-plan/route.ts` — use repository for recipes + store generated plan

**Repository interfaces:**

```typescript
interface RecipeRepository {
  list(): Promise<Recipe[]>;
  getById(id: string): Promise<Recipe | null>;
  create(data: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Promise<Recipe>;
  update(id: string, data: Partial<Recipe>): Promise<Recipe | null>;
  delete(id: string): Promise<boolean>;
}

interface MealPlanRepository {
  save(plan: MealPlan): Promise<StoredMealPlan>;
  getCurrent(): Promise<StoredMealPlan | null>;
  list(limit?: number): Promise<StoredMealPlan[]>;
}

interface StoredMealPlan extends MealPlan {
  id: string;
  created_at: string;
}
```

**SQLite schema:**

```sql
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
  name TEXT NOT NULL,
  ingredients TEXT NOT NULL DEFAULT '[]',
  instructions TEXT,
  tags TEXT DEFAULT '[]',
  servings INTEGER,
  prep_time INTEGER,
  cook_time INTEGER,
  source_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id TEXT PRIMARY KEY,
  dinners TEXT NOT NULL,
  grocery_list TEXT NOT NULL,
  week_of TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

SQLite stores ingredients/tags/dinners/grocery_list as JSON text, parsed on read.

**Factory (`src/lib/storage/index.ts`):**

```typescript
export function getRecipeRepo(): RecipeRepository { ... }
export function getMealPlanRepo(): MealPlanRepository { ... }
```

Checks `SUPABASE_URL` — if set, returns Supabase adapters; otherwise SQLite. Singletons cached in module scope.

### Unit 2: Seed Local DB with Demo Data

When SQLite adapter initializes and the recipes table is empty, seed it with `DEMO_RECIPES` from `src/lib/demo-data.ts`. This replaces the in-memory demo store behavior.

**Files to modify:**
- `src/lib/storage/sqlite.ts` — add seed logic in init
- `src/lib/demo-mode.ts` — simplify to just export `isLocalMode()` and `isGeminiAvailable()`; remove `demoStore` and `generateDemoMealPlan` (moved to storage layer)

### Unit 3: Migrate API Routes to Repository

Replace all direct Supabase calls and demoStore usage in API routes with repository calls.

**Pattern change in each route:**
```typescript
// Before:
if (isDemoMode()) {
  return NextResponse.json(demoStore.listRecipes());
}
const { data, error } = await getSupabase().from("recipes")...

// After:
const recipes = await getRecipeRepo().list();
return NextResponse.json(recipes);
```

Routes become storage-agnostic. Error handling moves into the repository implementations.

### Unit 4: GET /api/plan/current Endpoint

New API route that returns the most recent stored meal plan.

**File:** `src/app/api/plan/current/route.ts`

- `GET` — returns latest meal plan or 404 if none generated yet
- Auth: Bearer token (same `CRON_SECRET` pattern)

### Unit 5: Store Generated Plans

Modify `POST /api/generate-plan` to persist the plan after generation.

**Changes to `src/app/api/generate-plan/route.ts`:**
- After validation, call `getMealPlanRepo().save(plan)`
- Include `planId` in the response

### Unit 6: On-Demand Generation UI

New page at `/generate` with a button to trigger meal plan generation and display the result.

**Files to create:**
- `src/app/generate/page.tsx` — generate plan page

**UI flow:**
1. Page loads, shows "Generate Meal Plan" button + optional preferences textarea
2. User clicks generate → calls `POST /api/generate-plan` (no auth needed from same origin — add cookie/session bypass or make auth optional for same-origin)
3. Shows loading state while Gemini works
4. Displays the generated plan: dinner cards (day, recipe name, servings, notes) + grocery list
5. "Regenerate" button to try again
6. If email is configured, shows "Email sent" confirmation

**Auth consideration:** The generate endpoint currently requires Bearer token. For the UI, either:
- (a) Skip auth when the request comes from the UI (check Origin/Referer) — **too fragile**
- (b) Add a session-based bypass — **over-engineered for now**
- (c) **Include CRON_SECRET as a build-time env var** for the UI to use — simple, works on Vercel
- (d) **Make auth optional when no CRON_SECRET is configured** — matches the local-first philosophy

**Decision: option (d)** — if `CRON_SECRET` is not set, skip auth. This means local mode needs no secret. When deployed with a secret, the UI page can prompt for it or store it in localStorage.

**Files to modify:**
- `src/app/layout.tsx` — add "Generate Plan" nav link
- `src/app/api/generate-plan/route.ts` — make auth conditional on CRON_SECRET being configured

### Unit 7: Update Demo Banner & Status

- Rename "Demo mode" to "Local mode" in the banner text
- Update `/api/status` to return `{ local: boolean, geminiAvailable: boolean }`
- Update `DemoBanner.tsx` to use new field name

### Unit 8: Test Coverage

**New test files:**
- `src/lib/storage/sqlite.test.ts` — full CRUD tests for SQLite recipe + meal plan repos
- `src/lib/storage/index.test.ts` — factory tests (env-based selection)
- `src/app/api/plan/current/route.test.ts` — GET current plan endpoint
- `src/app/generate/page.component.test.tsx` — generate page UI tests

**Modified test files:**
- `src/app/api/recipes/route.test.ts` — update mocks from Supabase to repository
- `src/app/api/recipes/[id]/route.test.ts` — same
- `src/app/api/generate-plan/route.test.ts` — update mocks, add plan storage assertions

## Implementation Order

1. **Unit 1** — Storage abstraction (foundation for everything else)
2. **Unit 2** — Seed logic
3. **Unit 3** — Migrate routes (makes the app work with new storage)
4. **Unit 5** — Store plans (needed before the read endpoint)
5. **Unit 4** — GET /api/plan/current
6. **Unit 7** — Banner/status updates
7. **Unit 6** — On-demand generation UI
8. **Unit 8** — Tests (alongside each unit, listed last for clarity)

## Dependencies

- `better-sqlite3` + `@types/better-sqlite3` — npm packages to add

## Risk & Scope Notes

- `better-sqlite3` is a native module — works fine in Node.js/Vercel serverless but needs to be excluded from client bundles. Next.js handles this automatically for `node:` modules in API routes.
- SQLite file location: `./data/meal-assistant.db` in project root, added to `.gitignore`
- No migration framework needed — tables are created with `IF NOT EXISTS` on first access
- The Supabase adapter is a thin wrapper around existing code, not new functionality
