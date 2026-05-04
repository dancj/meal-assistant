# Design System — Meal Assistant (Editorial)

> A portable, calm aesthetic

## Pillars

1. **Paper, not glass.** The surface is warm off-white with hairline borders. No drop shadows on resting state, no glass blur. Depth comes from typography hierarchy and white space, not z-elevation.
2. **One accent.** Forest green, used sparingly: primary buttons, sync state, "fits your rules" sparkles, theme pills, progress fills. Never decorative.
3. **Editorial typography.** Display sizes go bigger than feels comfortable (44–56px). Body stays small (13–14px). The contrast does the work. Track in (-0.02 to -0.03em) at display sizes, neutral elsewhere.
4. **Hairlines over boxes.** Lists are rule-divided. Cards exist but are quiet — paper-edge border, no shadow until hover.
5. **Mono for metadata.** Anything technical (dates, durations, counts, identifiers, eyebrows) is in Geist Mono. Anything conversational is sans.
6. **Motion is felt, not seen.** Fades and 4–8px slides at 160/220ms with one easing curve. No springs, no bounce, no choreography.

## Type system

| Role     | Family | Size  | Weight | Tracking | Use                                   |
|----------|--------|-------|--------|----------|---------------------------------------|
| display  | sans   | 56    | 500    | -0.03em  | Hero page title (Week)                |
| h1       | sans   | 44    | 500    | -0.025em | Section landing titles                |
| h2       | sans   | 28    | 500    | -0.02em  | Meal name in week timeline            |
| h3       | sans   | 22    | 500    | -0.015em | Cuisine groupers, drawer titles       |
| h4       | sans   | 18    | 500    | -0.01em  | Pane titles, store names              |
| body     | sans   | 14    | 400    | 0        | Default body                          |
| body-sm  | sans   | 13    | 400    | 0        | Card descriptions                     |
| caption  | sans   | 12.5  | 400    | 0        | Field hints, footnotes                |
| eyebrow  | mono   | 11    | 400    | 0.08em   | Section labels (UPPERCASE, ink-3)     |
| mono-sm  | mono   | 12    | 400    | 0        | Date/duration metadata                |

Always use `text-wrap: pretty` for body and `text-wrap: balance` for headlines.

## Color

A warm-paper / cool-slate palette anchored by a single forest accent. All colors are oklch so they tone-shift gracefully if you derive a dark mode.

- **Surfaces:** paper → paper-2 (alt) → paper-edge (border)
- **Text:** ink (primary) → ink-2 (secondary) → ink-3 (tertiary, eyebrows, metadata)
- **Accent:** forest (action) / forest-2 (hover) / forest-soft (tinted bg)
- **States:**
  - amber-soft / amber-ink → kid notes, soft warnings
  - rose-soft / rose-ink → dislikes, allergens
  - slate-soft / slate-ink → neutral metadata pills

See `tokens.json` for hex equivalents.

## Spacing & rhythm

Spacing scale: `0 2 4 6 8 10 12 14 16 20 24 28 32 40 48 56 64`.

- Page horizontal padding: 64.
- Page vertical padding: 32 top, 60 bottom.
- Section gap: 32.
- Hairline rule = `1px solid paper-edge`. Use it instead of cards for dense lists.

Density is a setting (`compact` / `cozy` / `roomy`) that scales card and meal-row padding only — never type sizes.

## Radii

`xs 6 / sm 10 / md 14 / lg 20 / pill 999`. Pills for buttons and tags; md for cards; sm for form fields and tile icons.

## Motion

Two durations, one easing.

- `fast = 160ms` for hover, press, color shifts.
- `medium = 220ms` for entrances, drawers, fades.
- Easing: `cubic-bezier(.2, .6, .2, 1)` always.
- Entry: `opacity 0 → 1` + `translateY(4px → 0)`.
- Drawer: `translateX(100% → 0)` over 220ms.
- Honor `prefers-reduced-motion: reduce` — collapse all transforms; keep an 80ms opacity fade only.

## Components (portable)

The following are domain-agnostic and should be lifted into your shared UI library:

- **Button** (`primary`, `ghost`, `default`, sizes `sm` `md`, `icon` variant).
- **Pill** (`forest`, `slate`, `amber`, `rose` color modes).
- **Card** (paper bg, paper-edge border, hairline hover shadow).
- **Eyebrow** (the mono-uppercase label).
- **Field + Label + Hint** (form primitives).
- **Drawer** (right-side, 420 default, backdrop included).
- **Modal** (centered, sticky footer pattern).
- **HairlineList** (parent that gives all children a top border except the first).

The following are meal-flavored but rebuildable elsewhere:

- **CadencePulse** — 14-pip rotation indicator. The pattern (small linear pip array + mono caption) generalizes to any "time since" or "frequency" visual.
- **KidNote** — name pill + free text in an amber tile. Generalizes to any annotated callout.

## Iconography

Custom 24×24 stroke icons (1.6 stroke, round caps/joins). Names in `atoms.jsx::Icon`. Don't substitute Heroicons or Lucide unless you re-tune the stroke weight to match — the weight is what makes them feel of-a-piece.

## What to avoid

- Drop shadows on resting cards.
- Gradients.
- Emoji as iconography.
- Any color outside the palette (no system blues, no semantic reds — use rose-ink).
- Generic stock icons.
- Microcopy patterns: "Oops!", "delicious", "yummy", exclamation marks generally.
- Pluralization tricks like "1 item(s)".

## Adapting to dark mode (future)

- Invert paper / ink: `paper` becomes `oklch(0.18 0.01 80)`, `ink` becomes `oklch(0.96 0.005 80)`.
- Forest stays the same chroma but shifts lightness up by ~0.1.
- Soft tints (amber/rose/slate) become low-chroma overlays with `mix-blend-mode: screen` or hand-tuned dark variants.
- Hairlines become `oklch(0.28 0.008 80)`.
