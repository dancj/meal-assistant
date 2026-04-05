---
title: "feat: Add meal plan viewer page with history"
type: feat
status: completed
date: 2026-04-05
---

# feat: Add meal plan viewer page with history

## Overview

Add a `/plans` page that shows the current meal plan and a history of past plans. The storage layer (`MealPlanRepository.list()`) already exists — this needs an API endpoint to expose it and a page to display it.

## Problem Frame

Users can generate meal plans via the `/generate` page, but there's no way to view previous plans or revisit the current week's plan without regenerating. The generate page shows the plan only in the same session — refreshing loses it. A dedicated viewer page lets users check the current plan at any time and browse past weeks.

Related: dancj/meal-assistant#9

## Requirements Trace

- R1. `/plans` page shows the current week's meal plan (dinners + grocery list)
- R2. Page shows a list of past meal plans with their `weekOf` dates
- R3. Clicking a past plan expands or navigates to show its full details
- R4. Navigation header includes a link to `/plans`
- R5. Loading and empty states are handled gracefully

## Scope Boundaries

- No pagination — `MealPlanRepository.list(10)` is sufficient for household-scale history
- No plan editing or deletion — read-only viewer
- No changes to the generate page — it keeps its inline plan display
- No new storage methods — `list()` and `getCurrent()` already exist

## Context & Research

### Relevant Code and Patterns

- **Storage interface:** `MealPlanRepository.list(limit?: number)` in `src/lib/storage/types.ts` — returns `StoredMealPlan[]` ordered by `created_at DESC`, default limit 10
- **Current plan API:** `src/app/api/plan/current/route.ts` — pattern to follow for the new list endpoint
- **Plan display template:** `src/app/generate/page.tsx` lines 176-235 — existing dinners/grocery tabs UI to adapt
- **Page data fetching:** `src/app/page.tsx` — `useState` + `useEffect` + `fetch` pattern with loading skeleton
- **Navigation header:** `src/app/layout.tsx` lines 35-59 — sticky header with nav links
- **Types:** `StoredMealPlan` in `src/lib/storage/types.ts`, `MealPlan` in `src/types/meal-plan.ts`

## Key Technical Decisions

- **Single page with expandable history** rather than separate `/plans/:id` routes — keeps it simple. The current plan is shown prominently at the top, past plans are collapsible cards below.

- **New `GET /api/plans` endpoint** rather than fetching from the client via the storage layer directly — follows the existing API route pattern and works with auth.

## Open Questions

### Resolved During Planning

- **Should the plans API require auth?** Yes — follow the same `requireAuth` pattern as other endpoints.
- **Should past plans show full details or just summaries?** The API returns full plans. The UI shows summaries in the list with expandable details to avoid clutter.

### Deferred to Implementation

- Exact layout for the history list (cards vs table vs accordion)
- Whether to use the same Tabs component from the generate page or a simpler layout

## Implementation Units

- [x] **Unit 1: Add GET /api/plans endpoint**

**Goal:** Expose meal plan history via a list API.

**Requirements:** R2

**Dependencies:** None

**Files:**
- Create: `src/app/api/plans/route.ts`
- Test: `src/app/api/plans/route.test.ts`

**Approach:**
- GET handler that calls `getMealPlanRepo().list(limit)` where `limit` comes from `?limit=` query param (default 10)
- Use `requireAuth` from `src/lib/auth.ts`
- Return JSON array of `StoredMealPlan` objects

**Patterns to follow:**
- `src/app/api/plan/current/route.ts` for route structure and auth pattern

**Test scenarios:**
- Happy path: Returns array of plans with 200
- Happy path: Returns empty array when no plans exist
- Happy path: `?limit=5` returns at most 5 plans
- Happy path: Auth skipped when CRON_SECRET is empty
- Error path: Returns 401 when CRON_SECRET is set and token is missing
- Error path: Returns 500 on storage error

**Verification:**
- `GET /api/plans` returns a JSON array of stored meal plans

- [x] **Unit 2: Create /plans page with current plan and history**

**Goal:** Build the meal plan viewer page showing current plan and past plans.

**Requirements:** R1, R2, R3, R5

**Dependencies:** Unit 1

**Files:**
- Create: `src/app/plans/page.tsx`

**Approach:**
- Client component that fetches both `GET /api/plan/current` and `GET /api/plans` on mount
- Top section: current plan with dinners and grocery list (adapt the tabbed display from the generate page)
- Bottom section: past plans listed by `weekOf` date with expandable details
- Loading skeleton while fetching
- Empty state if no plans have been generated yet
- Include auth header handling (same localStorage secret pattern as generate page)

**Patterns to follow:**
- `src/app/generate/page.tsx` for plan display (dinners tab, grocery list tab)
- `src/app/page.tsx` for data fetching and loading skeleton pattern

**Test scenarios:**
- Happy path: Current plan renders with dinners and grocery list
- Happy path: Past plans render as a list with `weekOf` dates
- Edge case: No plans exist — shows empty state message
- Edge case: Only one plan (current) — no "past plans" section

**Verification:**
- `/plans` page loads, shows current plan prominently, and lists history below

- [x] **Unit 3: Add Plans link to navigation header**

**Goal:** Make the plans page discoverable from the main navigation.

**Requirements:** R4

**Dependencies:** Unit 2

**Files:**
- Modify: `src/app/layout.tsx`

**Approach:**
- Add a "Plans" or "Meal Plans" link to the header nav, between the existing "Generate Plan" and "Add Recipe" buttons
- Use the same Button component with `variant="outline"` and a calendar icon (CalendarDays from lucide-react)

**Patterns to follow:**
- Existing nav links in `src/app/layout.tsx` (Generate Plan button pattern)

**Test expectation:** none — pure navigation/styling change

**Verification:**
- Header shows a "Meal Plans" link that navigates to `/plans`

## System-Wide Impact

- **API surface:** One new endpoint (`GET /api/plans`) — read-only, auth-protected
- **Navigation:** One new header link — no existing links affected
- **Unchanged invariants:** Generate page, plan/current endpoint, recipe CRUD — all unchanged

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| No plans generated yet (new install) | Empty state UI with link to generate page |
| Auth on plans endpoint blocks UI when CRON_SECRET is set | Same localStorage secret pattern as generate page |

## Sources & References

- Related issue: dancj/meal-assistant#9
- Storage interface: `src/lib/storage/types.ts`
- Plan display template: `src/app/generate/page.tsx`
