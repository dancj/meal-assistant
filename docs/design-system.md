# Meal Assistant Design System

The canonical design system for this app is the **Editorial** system delivered in the `design/` handoff folder at the repo root.

- **Pillars, type scale, color, motion, components:** [`design/design-system.md`](../design/design-system.md)
- **Machine-readable tokens:** [`design/tokens.json`](../design/tokens.json)
- **Screen-by-screen spec:** [`design/spec.md`](../design/spec.md)
- **Suggested data model:** [`design/data-model.ts`](../design/data-model.ts)
- **Source-of-truth prototype:** `design/Meal Assistant.html`

The previous olive/terracotta system this file documented is retired — see issue #86 for the makeover.

## Where the tokens live in code

- `src/app/globals.css` — Editorial tokens declared as CSS custom properties on `:root` (`--paper`, `--ink`, `--forest`, `--paper-edge`, `--forest-soft`, `--amber-soft`/`--amber-ink`, `--slate-soft`/`--slate-ink`, `--rose-soft`/`--rose-ink`, `--ink-2`, `--ink-3`, `--forest-2`).
- The same file's `@theme inline` block exposes them as Tailwind utilities: `bg-paper`, `text-ink`, `border-paper-edge`, `bg-forest-soft text-forest-2`, etc.
- The shadcn semantic tokens (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, …) are re-bound to the Editorial palette so existing primitives keep rendering with the new colors.

## What's authoritative

When in doubt, **`design/tokens.json` is the visual contract**. Don't pixel-match against the prototype HTML — match against the tokens. If you find a discrepancy between this README, `design/design-system.md`, and `tokens.json`, trust `tokens.json` and file a doc fix.

## Quick reference

### Colors

| Surface | Token | Use |
|---|---|---|
| `--paper` | page bg, primary surface |
| `--paper-2` | alt surface (hover, modal footers) |
| `--paper-edge` | hairline borders, dividers |
| `--ink` | primary text |
| `--ink-2` | secondary text, nav resting |
| `--ink-3` | tertiary text, eyebrows, metadata |
| `--forest` | single accent — primary buttons, sync state, theme pills, progress |
| `--forest-2` | hover/active for accent |
| `--forest-soft` | tinted bg behind forest text/icons |
| `--amber-soft` / `--amber-ink` | kid notes, soft warnings |
| `--slate-soft` / `--slate-ink` | neutral metadata pills |
| `--rose-soft` / `--rose-ink` | dislikes, allergens |

### Typography utilities

`text-display` (56) · `text-h1` (44) · `text-h2` (28) · `text-h3` (22) · `text-h4` (18) · `text-body` (14) · `text-body-sm` (13) · `text-caption` (12.5) · `text-eyebrow` (11, mono, uppercase, tracked) · `text-mono-sm` (12, mono).

### Radii

`rounded-xs` (6) · `rounded-sm` (10) · `rounded-md` (14, default) · `rounded-lg` (20) · `rounded-pill` (9999).

### Motion

Two durations, one easing.

- `duration-fast` = 160ms — hover, press, color shifts.
- `duration-medium` = 220ms — entrances, drawers, fades.
- `ease-editorial` = `cubic-bezier(.2,.6,.2,1)`.
- Entry pattern: `opacity 0 → 1` + `translateY(4px → 0)`.
- `prefers-reduced-motion: reduce` collapses transforms to an 80ms opacity fade (handled in `globals.css`).
