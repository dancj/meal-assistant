---
title: "Recipe management web UI"
type: feat
status: completed
date: 2026-03-07
origin: docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md
---

# Recipe management web UI

## Overview

Build a simple, functional web UI for managing household recipes — the P1 milestone from the MVP brainstorm (see brainstorm: `docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md`). The UI replaces the default Next.js starter page with a recipe CRUD interface built on the existing API routes (#2, merged).

## Problem Statement / Motivation

Recipes are currently only accessible via API calls. Household members need a web interface to add, browse, edit, and delete recipes so the recipe pool stays current for weekly meal plan generation. The web UI is the primary way non-technical users interact with the system.

## Proposed Solution

Four pages using Next.js 15 App Router with Tailwind CSS v4:

| Route | Purpose | Rendering |
|-------|---------|-----------|
| `/` | Recipe list with client-side search/filter | Server Component (list) + Client island (search/filter) |
| `/recipes/new` | Add recipe form | Client Component |
| `/recipes/[id]` | Recipe detail (read-only) | Server Component |
| `/recipes/[id]/edit` | Edit recipe form | Client Component |

### Key Design Decisions

1. **Separate pages, not modals** — simpler, accessible, deep-linkable, browser back button works naturally
2. **Recipe detail page exists** — read-only view at `/recipes/[id]` with Edit/Delete actions, prevents accidental edits
3. **Client-side search/filter** — the recipe list is small (household scale); no API changes needed. `GET /api/recipes` already returns all recipes
4. **Search**: case-insensitive substring match on recipe `name`
5. **Tag filter**: OR logic (show recipes matching any selected tag), tags derived from distinct values across all recipes
6. **Tags input**: comma-separated text field (simple, no widget)
7. **Delete confirmation**: `window.confirm()` (accessible by default, zero UI cost)
8. **After add**: redirect to recipe list. **After edit**: redirect to recipe detail
9. **Shared `RecipeForm` component** for add and edit (same fields, pre-filled for edit)
10. **No auth** — household tool, consistent with existing unprotected API routes (see brainstorm decision)
11. **Dark mode**: basic support via Tailwind `dark:` variants, matching existing `globals.css` light/dark tokens

## Technical Considerations

- **Tailwind CSS v4**: Use CSS-based config with `@theme inline` in `globals.css`. No `tailwind.config.ts`. Extend theme tokens only if needed.
- **Next.js 15 async params**: Dynamic routes must use `params: Promise<{ id: string }>` with `await params` (matching existing `[id]/route.ts` pattern)
- **Data fetching**: Server Components fetch directly from Supabase via `getSupabase()` (not via internal API routes). Client Components use `fetch('/api/recipes/...')`.
- **Mutation refresh**: After create/update/delete, use `router.push()` + `router.refresh()` to invalidate Server Component cache
- **PUT semantics**: The API uses full replacement — edit form must always submit the complete recipe body
- **Ingredient rows**: Dynamic add/remove. Start with one empty row. "Add ingredient" button adds rows. Cannot remove last row (API requires at least one). `quantity` and `unit` are optional per the validation in `recipe-validation.ts` (only `name` is required).
- **No pagination**: all recipes loaded at once (household scale, brainstorm assumption)
- **HTML escaping**: React handles this automatically via JSX interpolation — no manual escaping needed

## Acceptance Criteria

### Recipe List Page (`/`)

- [x] Replaces the default Next.js starter page
- [x] Displays all recipes as cards/rows with name, tags, and servings
- [x] Shows a search input that filters recipes by name (case-insensitive substring)
- [x] Shows tag filter chips/buttons derived from all recipe tags; clicking filters by that tag (OR logic)
- [x] Search and tag filter work together (intersection)
- [x] "Add Recipe" button links to `/recipes/new`
- [x] Clicking a recipe name/card links to `/recipes/[id]`
- [x] Empty state: "No recipes yet" with prominent "Add your first recipe" link
- [x] No-results state: "No recipes match your search" (distinct from empty state)
- [x] Loading state while fetching recipes

### Recipe Detail Page (`/recipes/[id]`)

- [x] Displays all recipe fields: name, ingredients (with quantity/unit), instructions, tags, servings, prep time, cook time, source URL (clickable link), notes
- [x] "Edit" button links to `/recipes/[id]/edit`
- [x] "Delete" button with `window.confirm()` — on confirm, calls `DELETE /api/recipes/:id` and redirects to `/`
- [x] "Back to recipes" link
- [x] Handles 404 (recipe not found) with a clear message
- [x] Prep time and cook time displayed as `X min`

### Add Recipe Page (`/recipes/new`)

- [x] Form with fields: name, ingredients (dynamic rows), instructions (textarea), tags (comma-separated text input), servings (number), prep time (number, minutes), cook time (number, minutes), source URL, notes (textarea)
- [x] Ingredient rows: each row has name, quantity, unit inputs + remove button
- [x] "Add ingredient" button appends a new empty row
- [x] Cannot remove the last ingredient row
- [x] Client-side validation: name required, at least one ingredient with a name
- [x] Submit button disabled with "Saving..." text during submission
- [x] On success: redirect to `/`
- [x] On API error: display error message above the form
- [x] "Cancel" link returns to `/`

### Edit Recipe Page (`/recipes/[id]/edit`)

- [x] Same form as Add, pre-filled with existing recipe data
- [x] Fetches recipe by ID on mount
- [x] Loading state while fetching
- [x] 404 handling if recipe not found
- [x] On success: redirect to `/recipes/[id]`
- [x] Submit sends full recipe body via `PUT /api/recipes/:id`

### Shared Components

- [x] `RecipeForm` component used by both Add and Edit pages
- [x] Consistent styling: single-column layout, max-width container, readable font sizes, mobile-friendly
- [x] Responsive: form fields stack on narrow viewports, ingredient rows usable on mobile
- [x] Basic dark mode support via existing Tailwind theme tokens
- [x] All form fields have associated `<label>` elements

### Tests

- [x] `RecipeForm` component tests: renders fields, adds/removes ingredient rows, validates required fields, handles submit
- [x] Recipe list page test: renders recipes, filters by search, filters by tags
- [x] Integration: add recipe flow (form submit → API call → redirect)
- [x] Integration: delete recipe flow (confirm → API call → redirect)

## Implementation Plan

### Phase 1: Shared components and layout

**Files to create:**
- `src/components/RecipeForm.tsx` — shared form component for add/edit
- `src/app/layout.tsx` — update with simple nav header (app name + "Add Recipe" link)

The `RecipeForm` component accepts props:
```typescript
// src/components/RecipeForm.tsx
interface RecipeFormProps {
  initialData?: Recipe;  // undefined for add, populated for edit
  onSubmit: (data: RecipeFormData) => Promise<void>;
  submitLabel: string;   // "Add Recipe" or "Save Changes"
}
```

Ingredient row state managed with `useState` array. Tags entered as comma-separated string, split on submit.

### Phase 2: Recipe list page (`/`)

**Files to create/modify:**
- `src/app/page.tsx` — replace starter content with recipe list
- `src/components/RecipeList.tsx` — client component for search/filter/display

Server Component at `src/app/page.tsx` fetches recipes via `getSupabase()` and passes to `RecipeList` client component. The client component handles search input, tag filter state, and filtered rendering.

Tag chips derived from `[...new Set(recipes.flatMap(r => r.tags))]`.

### Phase 3: Recipe detail page

**Files to create:**
- `src/app/recipes/[id]/page.tsx` — Server Component, fetches recipe by ID, renders detail view with Edit/Delete actions

Delete button is a client island (`DeleteButton` component) that calls `window.confirm()` then `fetch DELETE`.

### Phase 4: Add and Edit pages

**Files to create:**
- `src/app/recipes/new/page.tsx` — wraps `RecipeForm` with POST submit handler
- `src/app/recipes/[id]/edit/page.tsx` — fetches recipe, wraps `RecipeForm` with PUT submit handler

### Phase 5: Tests

**Files to create:**
- `src/components/RecipeForm.test.tsx`
- `src/app/page.component.test.tsx` — update existing test for new list page
- `src/app/recipes/[id]/page.test.tsx`

Use Vitest + @testing-library/react (already configured). Mock `fetch` for API calls. Test form validation, ingredient row add/remove, submit behavior.

## Dependencies & Risks

**Dependencies:**
- Issue #2 (Recipe CRUD API routes) — **merged**
- `@testing-library/react` and `jsdom` — **installed**
- Tailwind CSS v4 — **configured**

**Risks:**
- Server Components cannot use hooks or event handlers — interactive parts (search, filter, forms, delete button) must be Client Components or client islands. This is standard App Router architecture but requires careful component boundaries.
- `getSupabase()` uses `SUPABASE_SERVICE_ROLE_KEY` which is server-only. Server Components can call it directly; Client Components must go through API routes. This is already the established pattern.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md](docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md) — Key decisions: simple web UI for recipe management (P1), Tailwind CSS v4, build on Supabase CRUD

### Internal References

- Recipe CRUD API: `src/app/api/recipes/route.ts`, `src/app/api/recipes/[id]/route.ts`
- Recipe types: `src/types/recipe.ts`
- Recipe validation: `src/lib/recipe-validation.ts`
- Supabase client: `src/lib/supabase.ts`
- Tailwind theme: `src/app/globals.css`
- Root layout: `src/app/layout.tsx`
- Existing test setup: `vitest.config.ts`, `src/test/setup.ts`, `src/test/helpers.ts`
- Async params pattern: `src/app/api/recipes/[id]/route.ts:16`

### Related Work

- Issue #2 (Recipe CRUD API routes) — merged
- Issue #5 (this feature)
- MVP plan: `docs/plans/2026-02-21-feat-meal-assistant-mvp-plan.md`
