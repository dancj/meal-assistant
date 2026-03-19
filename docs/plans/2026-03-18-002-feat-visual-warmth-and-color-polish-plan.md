---
title: "feat: Add visual warmth, color, and polish to UI"
type: feat
status: active
date: 2026-03-18
---

# feat: Add visual warmth, color, and polish to UI

## Overview

The UI is functional but visually flat — all grayscale with zero color personality. For a meal/cooking app, the visual identity should feel warm, inviting, and appetizing. This plan adds color, richer iconography, and visual polish without changing any functionality.

## Problem Statement

The screenshot shows:
- **No color anywhere** — every surface is black, white, or gray (shadcn "neutral" base = `oklch(x 0 0)`, pure grayscale)
- **Primary button is solid black** — feels heavy, not inviting
- **Tags/badges are gray-on-gray** — no visual pop
- **No visual hierarchy beyond typography** — sections blend together
- **Form feels like a spreadsheet** — no warmth, no delight

## Proposed Solution

Three targeted changes, all in CSS + component classes. No structural changes, no new dependencies.

### 1. Warm Color Theme (`globals.css`)

Replace the grayscale shadcn "neutral" palette with a warm, food-appropriate palette. Use oklch with actual chroma values:

- **Primary**: Warm green/olive (food, fresh, organic feel) — e.g. `oklch(0.45 0.12 155)`
- **Primary foreground**: White
- **Accent**: Warm amber/golden — e.g. `oklch(0.85 0.10 85)`
- **Secondary**: Warm cream — e.g. `oklch(0.97 0.01 90)`
- **Destructive**: Keep red, already has chroma
- **Background**: Very slight warm tint — e.g. `oklch(0.995 0.002 90)` instead of pure white
- **Muted/borders**: Warm gray instead of pure gray — add small chroma at warm hue

### 2. Component Color & Icon Enhancements

- **Header**: Subtle warm background tint or colored bottom border accent
- **"Add Recipe" button**: Use the warm green primary — already works via `bg-primary`
- **Tag badges**: Use colored variants — soft green for recipe tags, golden for filter chips
- **Recipe cards**: Subtle warm border or left accent stripe
- **Form sections**: Light background tint on grouped fields (servings/prep/cook row)
- **Detail page**: Colored section headers or icons
- **Icons**: Add food-themed Lucide icons where contextual (Timer for prep/cook, ChefHat for instructions, NotebookPen for notes, Tag for tags)

### 3. Micro-Interactions & Polish

- **Card hover**: Gentle warm tint shift, not just opacity
- **Active tag**: Colored background (green primary) instead of black
- **Loading spinner**: Use primary color instead of muted
- **Empty state icon**: Use primary color tint

## Acceptance Criteria

### Theme (`src/app/globals.css`)
- [ ] Replace `--primary` with warm green/olive oklch value (non-zero chroma)
- [ ] Replace `--secondary` and `--accent` with warm cream/amber values
- [ ] Add slight warm tint to `--background` and `--card`
- [ ] Warm up `--muted`, `--border`, `--input` colors (add chroma)
- [ ] Dark mode: warm-tinted dark backgrounds, vibrant primary

### Components
- [ ] `layout.tsx` — Header gets subtle colored accent (border or bg tint)
- [ ] `RecipeList.tsx` — Tag filter badges use colored active state; recipe cards get warmer hover
- [ ] `RecipeForm.tsx` — Grouped field row gets subtle background; section icons next to labels
- [ ] Detail page (`recipes/[id]/page.tsx`) — Section icons (Timer, ChefHat, NotebookPen, Tag, Link), colored ingredient dots
- [ ] `page.tsx` — Loading spinner and empty state icon use primary color
- [ ] `DeleteButton.tsx` — Already using destructive variant, no change needed

### Quality
- [ ] Dark mode still looks cohesive (test with `.dark` class)
- [ ] All existing tests pass (Vitest + Cypress)
- [ ] Build and lint pass

## Files to Modify

| File | Change |
|------|--------|
| `src/app/globals.css` | Replace oklch color values in `:root` and `.dark` |
| `src/app/layout.tsx` | Header accent styling |
| `src/app/page.tsx` | Spinner + empty state color |
| `src/components/RecipeList.tsx` | Tag badge variants, card hover colors |
| `src/components/RecipeForm.tsx` | Section icons, grouped field bg |
| `src/app/recipes/[id]/page.tsx` | Section icons, ingredient dot color |

## Scope Boundaries

- **No new shadcn components** — use existing Button, Card, Badge, Input, etc.
- **No new npm dependencies** — Lucide icons already available
- **No layout/structure changes** — purely visual
- **No new pages or features**

## Sources

- Current theme: `src/app/globals.css` (all `oklch(x 0 0)` = zero chroma = pure gray)
- shadcn theming docs: https://ui.shadcn.com/docs/theming
- oklch color space: lightness, chroma (saturation), hue — adding chroma > 0 adds color
