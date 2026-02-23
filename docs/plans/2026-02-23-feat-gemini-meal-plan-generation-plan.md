---
title: "Integrate Google Gemini for meal plan generation"
type: feat
status: completed
date: 2026-02-23
origin: docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md
---

# Integrate Google Gemini for meal plan generation

## Overview

Create `POST /api/generate-plan` — fetches all recipes from Supabase, sends them to Google Gemini with dietary preferences, and returns a structured JSON meal plan: 5 dinners for the week + a consolidated grocery list. This is Phase 3 of the MVP pipeline (see brainstorm: docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md).

Email delivery (issue #4) is **not** in scope — this endpoint returns the plan in the response body only.

Ref: GitHub issue #3

## Problem Statement / Motivation

With recipes stored in Supabase (issue #2, complete), the next step is automating the selection of 5 weeknight dinners and generating a consolidated grocery list. Gemini's structured output capability (`responseSchema` + `responseMimeType: 'application/json'`) gives reliable, typed JSON responses without fragile text parsing.

## Proposed Solution

### File to create: `src/app/api/generate-plan/route.ts`

Single `POST` handler with this flow:

1. **Validate auth** — Check `Authorization: Bearer <CRON_SECRET>` header. Return `401` if missing or invalid.
2. **Parse optional body** — Accept optional `{ preferences?: string }` in the request body. Treat empty/missing body as "no preferences" (do NOT return 400 — the GitHub Actions cron caller may send no body).
3. **Fetch recipes** — `getSupabase().from('recipes').select('*')`. Return `500` on Supabase error.
4. **Check minimum count** — Require >= 5 recipes. Return `400` with `{ error: "Not enough recipes. Found X, need at least 5." }`.
5. **Calculate `weekOf`** — Compute the upcoming Monday's ISO date string server-side. Do not rely on Gemini for dates.
6. **Build prompt** — System instruction + user message with recipe data (id, name, tags, ingredients, servings). Exclude `instructions`, `prep_time`, `cook_time`, `notes`, `source_url` to save tokens.
7. **Call Gemini** — `ai.models.generateContent()` with `model: 'gemini-2.0-flash'`, `responseMimeType: 'application/json'`, and `responseSchema`.
8. **Parse + validate response** — `JSON.parse(response.text)`. Validate: exactly 5 dinners, all `recipeId` values exist in the fetched recipe set, no duplicate recipes.
9. **Override `weekOf`** — Replace Gemini's `weekOf` with the server-computed value (LLMs have poor date awareness).
10. **Return** — `{ success: true, plan: MealPlan }` with status `200`.

### Auth pattern

```typescript
const authHeader = request.headers.get("authorization");
const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

if (token !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Empty body handling

```typescript
let preferences: string | undefined;
try {
  const body = await request.json();
  preferences = typeof body.preferences === "string" ? body.preferences : undefined;
} catch {
  // Empty body is valid — cron caller may send no body
}
```

Cap `preferences` at 500 characters to avoid inflating token usage. Return `400` if exceeded.

### Prompt design

**System instruction:**

```
You are a meal planning assistant for a household. Your job is to select 5 dinners for the upcoming week from the provided recipe pool and generate a consolidated grocery list.

Guidelines:
- Select exactly 5 different recipes for Monday through Friday
- Prioritize variety in cuisine type, protein source, and cooking method
- Respect any dietary preferences or constraints provided
- For household members with special dietary needs, provide a brief alternative suggestion in the alternativeNote field (e.g., "Kid alternative: plain pasta with butter"). Set alternativeNote to null if no alternative is needed.
- Generate a deduplicated grocery list combining all ingredients from the selected recipes
- Adjust grocery quantities based on the number of servings for each dinner
```

**User message:**

```
Recipes available:
[For each recipe, formatted as:]
- ID: <uuid>
  Name: <name>
  Tags: <tags joined by comma>
  Servings: <servings or "not specified">
  Ingredients:
    - <quantity> <unit> <name>
    - ...

Dietary preferences: <preferences string, or "No specific dietary restrictions">

Select 5 dinners for the week of <weekOf> and generate the grocery list.
```

**Why include recipe IDs in the prompt:** The `MealPlanDinner` type has a `recipeId` field. Including the UUID next to each recipe name lets Gemini reference the correct ID. Post-generation validation confirms all returned IDs exist in the recipe set.

### Gemini response schema

Map the existing `MealPlan` type to a Gemini `responseSchema` using the `Type` enum from `@google/genai`:

```typescript
import { Type } from "@google/genai";

const mealPlanSchema = {
  type: Type.OBJECT,
  properties: {
    dinners: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: {
            type: Type.STRING,
            description: "Day of the week",
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          },
          recipeName: {
            type: Type.STRING,
            description: "Name of the selected recipe",
          },
          recipeId: {
            type: Type.STRING,
            description: "UUID of the recipe from the provided list",
          },
          servings: {
            type: Type.INTEGER,
            description: "Number of servings to prepare",
          },
          alternativeNote: {
            type: Type.STRING,
            nullable: true,
            description:
              "Brief alternative for household members with dietary needs, or null",
          },
        },
        required: [
          "day",
          "recipeName",
          "recipeId",
          "servings",
          "alternativeNote",
        ],
      },
    },
    groceryList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: {
            type: Type.STRING,
            description: "Grocery item name",
          },
          quantity: {
            type: Type.STRING,
            description: "Amount needed (e.g., '2 lbs', '1 can', '3')",
          },
        },
        required: ["item", "quantity"],
      },
    },
    weekOf: {
      type: Type.STRING,
      description: "ISO date string for the Monday of the meal plan week",
    },
  },
  required: ["dinners", "groceryList", "weekOf"],
};
```

Key schema decisions:
- **`day` uses an enum** — constrains to Monday–Friday, prevents "Day 1" or abbreviations
- **`alternativeNote` is `nullable: true`** — Gemini returns `null` when no alternative is needed
- **`servings` is `Type.INTEGER`** — prevents decimal servings
- **All fields are required** — ensures Gemini always populates every field

### Post-generation validation

After parsing Gemini's response, validate before returning:

1. `dinners` array has exactly 5 items
2. Every `recipeId` exists in the fetched recipe set
3. No duplicate `recipeId` values (5 different recipes)

If validation fails, return `500` with `{ error: "Failed to generate a valid meal plan" }` and log the specific validation failure server-side.

### Vercel timeout

```typescript
export const maxDuration = 60;
```

Requires Fluid Compute enabled in Vercel dashboard (Settings > Functions). Available on free tier. Gemini inference typically takes 3–8s; total pipeline ~10–15s with recipe fetch + prompt construction + inference + validation.

### Error handling

| Scenario | Status | Response |
|----------|--------|----------|
| Missing/invalid `CRON_SECRET` | 401 | `{ error: "Unauthorized" }` |
| `preferences` exceeds 500 chars | 400 | `{ error: "Preferences too long. Maximum 500 characters." }` |
| Fewer than 5 recipes | 400 | `{ error: "Not enough recipes. Found X, need at least 5." }` |
| Supabase fetch fails | 500 | `{ error: "Failed to fetch recipes" }` |
| Gemini call fails | 500 | `{ error: "Failed to generate meal plan" }` |
| `response.text` is empty/undefined | 500 | `{ error: "Failed to generate meal plan" }` |
| `JSON.parse` fails | 500 | `{ error: "Failed to parse meal plan response" }` |
| Post-generation validation fails | 500 | `{ error: "Failed to generate a valid meal plan" }` |

Server-side logging: `console.error("Failed to <verb>:", error)` — same pattern as recipe routes. Never expose raw Gemini errors to the client.

## Technical Considerations

- **Model:** `gemini-2.0-flash` — fast, capable, free tier (15 req/min, 1M tokens/day). Hardcoded for MVP; easy to swap later.
- **Token budget:** For ~50 recipes with id + name + tags + ingredients + servings, expect ~5K–10K input tokens. Well within free tier limits.
- **Structured output reliability:** `responseSchema` with `responseMimeType: 'application/json'` gives strong schema conformance guarantees from Gemini. The `JSON.parse` + semantic validation is a safety net.
- **`weekOf` is server-authoritative:** Computed server-side and overrides whatever Gemini returns. LLMs are unreliable with dates.
- **Recipe ID validation:** Including UUIDs in the prompt lets Gemini reference them, but LLMs can hallucinate. Post-generation validation catches mismatches.
- **Empty body handling:** `request.json()` is wrapped in try/catch. An empty POST body is valid (no preferences). This is critical for the GitHub Actions cron caller.
- **No email delivery:** This endpoint returns the plan only. Email is wired up in issue #4.
- **No retry logic:** If Gemini fails, the endpoint returns 500. Retries are the caller's responsibility (GitHub Actions can be configured with retry steps).

## System-Wide Impact

- **Interaction graph:** `POST /api/generate-plan` → reads from Supabase `recipes` table (read-only) → calls Gemini API (external) → returns JSON. No writes, no side effects beyond the Gemini API call.
- **Error propagation:** Supabase errors and Gemini errors are caught independently with distinct error messages. No cascading failure — each step has its own error handling.
- **State lifecycle risks:** None — this endpoint is stateless. No data is written. Plans are not persisted (that's P3).
- **API surface parity:** This is a new endpoint. No existing interfaces need updating.

## Acceptance Criteria

- [x] `POST /api/generate-plan` exists at `src/app/api/generate-plan/route.ts`
- [x] Protected by `CRON_SECRET` Bearer auth — returns `401` for missing/invalid token
- [x] Accepts optional `{ preferences?: string }` body — empty body is valid
- [x] Returns `400` when preferences exceed 500 characters
- [x] Fetches all recipes from Supabase
- [x] Returns `400` with recipe count when fewer than 5 recipes exist
- [x] Sends recipe data (id, name, tags, ingredients, servings) to Gemini with structured output schema
- [x] Uses `gemini-2.0-flash` model with `responseMimeType: 'application/json'` and `responseSchema`
- [x] Returns `{ success: true, plan: MealPlan }` with exactly 5 dinners + grocery list
- [x] Response conforms to the `MealPlan` type in `src/types/meal-plan.ts`
- [x] `day` values are constrained to Monday–Friday
- [x] All `recipeId` values in the response exist in the recipe set (validated post-generation)
- [x] No duplicate recipes in the 5 dinners (validated post-generation)
- [x] `weekOf` is set server-side to the upcoming Monday's ISO date
- [x] Handles Gemini errors gracefully (500 with generic message, error logged server-side)
- [x] `export const maxDuration = 60` set for Vercel Fluid Compute
- [x] `export const dynamic = "force-dynamic"` set
- [x] `npm run build` passes with no TypeScript errors
- [x] `npm run lint` passes

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Gemini returns invalid `recipeId` UUIDs | Post-generation validation checks all IDs exist in the recipe set |
| Gemini returns JSON that doesn't match schema | `responseSchema` provides strong guarantees; `JSON.parse` + validation as safety net |
| Vercel 10s default timeout | `maxDuration = 60` with Fluid Compute (free tier) |
| Free tier rate limits (15 req/min) | Only 1 plan per trigger; well within limits |
| Prompt produces poor/repetitive plans | Iterate on prompt; `day` enum + variety instructions reduce repetition |
| Empty POST body from cron caller | `request.json()` wrapped in try/catch; empty body treated as valid |
| `response.text` is undefined (content blocked) | Explicit check before `JSON.parse`; return 500 with descriptive error |

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/generate-plan/route.ts` | Create | POST handler — auth, fetch recipes, call Gemini, validate, return plan |

No other files needed. The Gemini client (`src/lib/gemini.ts`), Supabase client (`src/lib/supabase.ts`), and types (`src/types/meal-plan.ts`, `src/types/recipe.ts`) are already in place from previous phases.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md](docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md) — Key decisions: Gemini free tier over OpenAI, 5 dinners/week + grocery list, configurable dietary preferences, per-person overrides (kid-friendly alternatives)
- **MVP plan (Phase 3):** [docs/plans/2026-02-21-feat-meal-assistant-mvp-plan.md](docs/plans/2026-02-21-feat-meal-assistant-mvp-plan.md) — Endpoint flow, prompt strategy, response schema, auth pattern, `maxDuration = 60`
- **Recipe CRUD plan (complete):** [docs/plans/2026-02-22-feat-supabase-recipe-crud-api-routes-plan.md](docs/plans/2026-02-22-feat-supabase-recipe-crud-api-routes-plan.md) — Established route conventions (error shape, logging, `force-dynamic`, field whitelisting)
- **GitHub issue:** #3
- **`@google/genai` SDK:** `Type` enum for schema definitions, `responseMimeType: 'application/json'` + `responseSchema` for structured output, `ai.models.generateContent()` API
- **Existing code:** `src/lib/gemini.ts` (client), `src/types/meal-plan.ts` (types), `src/app/api/recipes/route.ts` (route conventions)
