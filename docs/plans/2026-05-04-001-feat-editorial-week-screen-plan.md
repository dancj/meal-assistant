---
title: "feat: Editorial Week-screen redesign (Phase 2 of #86)"
type: feat
status: active
date: 2026-05-04
origin: design/spec.md  # §2.1 Week screen + §3 components
---

# feat: Editorial Week-screen redesign (Phase 2 of #86)

## Overview

Redesign the home page (`src/app/page.tsx` → `src/components/home-page.tsx`) to the Editorial **Week** layout from `design/spec.md` §2.1. Replaces the current `<h1>This week's meals</h1>` header + responsive `<MealCard>` grid with a hairline-divided vertical timeline of day rows, fronted by a display-typography hero. Composes the primitives shipped in #87 (tokens) and #89 (Pill, Eyebrow, HairlineList, Drawer, Modal, refreshed Button).

This is Phase 2 items 4–6 of issue #86. Item 7 (`SwapDrawer`) is deferred to a follow-up PR; this PR keeps the existing `Swap meal` button behavior unchanged.

---

## Problem Frame

The home page currently ships a shadcn-default card grid that doesn't match the Editorial design language: cards-with-shadows instead of hairlines, `text-2xl font-semibold` H1 instead of a 56px display title, and no editorial metadata row (`{protein} · {prep} min · {Nd ago}`). The visible UI is the most-viewed surface of the app, so it's the highest-leverage place to land the Editorial pivot.

The 6 primitives shipped in #89 are domain-agnostic shells with no consumers in-repo. Phase 2 is where they meet the product. Domain-flavored components built on top — `DayLabel`, `MealRow`, `ThemePill`, `CadencePulse`, `KidNote`, `EventChip` — also live in `src/components/` (not `src/components/ui/`), since they encode meal-planning vocabulary.

Two reality constraints that shape the plan:

1. **`MealPlan.meals` is exactly 5 entries (Mon–Fri).** `REQUIRED_MEAL_COUNT = 5` in `src/lib/plan/types.ts`. The Editorial spec describes a 7-day timeline; we render the 5 weekday rows the API actually returns. Sat/Sun expansion is a future API-shape change, not this PR.
2. **`MealPlanMeal` has only `{ title, kidVersion, dealMatches }`.** No protein, prep, lastMade, theme tag, or calendar event in the payload. Day-row metadata is **synthesized client-side** in a new `src/lib/week-ui/` module. The shim is loud and named so the future API change can replace it cleanly.

---

## Requirements Trace

### Component contracts

- R1. **Week hero.** Eyebrow with date range + week number ("Apr 27 — May 03 · Issue 18"), `text-display`-sized title "This week, we're cooking.", right-side actions: `Regenerate` (ghost) + `Email this` (primary, conditional on `emailEnabled`). *(design/spec.md §2.1 Header)*
- R2. **Hairline-divided day rows.** A `<HairlineList>` of 5 day rows (Mon–Fri), each with three columns: 120px day-label column / flex meal column / 320px right action column. *(design/spec.md §2.1 Day rows)*
- R3. **Day-label column** — mono day abbrev (e.g., `MON`) over `Apr 27` ISO-derived date, theme pill underneath when applicable. *(design/spec.md §2.1 col 1)*
- R4. **Meal column** — h2-sized meal name (`text-h2`), mono metadata row (`{protein} · {prep} min · {Nd ago}` — synthesized), kid-mod amber chip(s), event chip when present. *(design/spec.md §2.1 col 2)*
- R5. **Right action column** — `thumb-up` / `thumb-down` toggle, then `Swap meal` ghost button. Behavior matches today's `MealCard` (clicking same direction twice clears it; Swap calls `swap(index)`). *(design/spec.md §2.1 col 3, §5.1 reactions, §3.5 buttons)*
- R6. **Theme pill** — Tuesday-Taco / Friday-Fish only (default themes); forest variant Pill with icon prefix. Synthesized from index + meal title. *(design/spec.md §2.1 theme pills)*
- R7. **CadencePulse** — 14 vertical pips, N most-recent days filled forest, trailing mono "Nd ago". For now `lastMade` is null (not in API), so the component renders the empty state ("never" or no pulse) and trace prepares for future API support. *(design/spec.md §3.3)*
- R8. **KidNote** — name pill on left, free text on right, amber tile. Triggered when `meal.kidVersion !== null`. The current `🧒` emoji + accent box is replaced. *(design/spec.md §3.2)*
- R9. **EventChip** — Pill with event-kind icon prefix; slate for skip events, amber for impact events. Component built and exported but not rendered this PR (no event data in API). *(design/spec.md §3.4)*

### Implementation discipline

- R10. Reuse the primitives from #89 — `Pill`, `Eyebrow`, `HairlineList`, refreshed `Button`. Domain components compose them rather than re-styling primitives.
- R11. Day-row data comes from a new `src/lib/week-ui/` module with pure functions: `formatWeekRange(weekStart)`, `weekIssueNumber(date)`, `synthesizeDay(meal, index, weekStart)`. The `src/lib/week-ui/` module **extends `src/lib/plan-ui/week.ts`** rather than creating a parallel implementation: `getMondayOfWeek(today)` is the existing `currentWeekStart` refactored to return a `Date` instead of an ISO string, with `currentWeekStart` kept as a thin wrapper for its existing callers (`use-plan-state.ts`, `/api/email/route.ts`). Exported types match shapes consumers need; the shim is documented as "until a richer `/api/generate-plan` contract lands."
- R12. TDD per CLAUDE.md `meal-assistant:tdd-vitest` for behavior. Pure styling skips TDD.
- R13. Existing tests for the current home page (`src/app/page.test.tsx`) must continue to pass after the wiring change, or be updated in the same commit when the assertion targets a removed element. Existing `meal-card.test.tsx` is deleted with the component (callsite migration is in this PR).
- R14. **No backend changes.** No `/api/generate-plan` shape change, no new API route, no env vars. The `dealMatches` array on each meal is left untouched — the `DealsSidebar` already surfaces deal data and that surface is unchanged.
- R15. **Accessibility.** Meal names are rendered as `<h2>` (was `<h3>` via `CardTitle`). Thumbs up/down keep `aria-label` and `aria-pressed`. Swap button keeps `aria-label`. Eyebrow is read as plain text (mono uppercase is a visual-only treatment). Hairline list semantics: use `<HairlineList as="ol">` since the rows are ordered (day sequence).

---

## Scope Boundaries

- **No `SwapDrawer`** in this PR. The current `swap(index)` flow stays as-is — clicking `Swap meal` triggers a re-generation that replaces the slot. The Drawer + suggestion ranking lands in a separate PR (umbrella item 7).
- **No skip-night UI rendering.** The `EventChip` component is built and tested, but no row currently has an event because the API doesn't return one. Plan keeps `EventChip` exported so the SwapDrawer / Calendar-integration PR can consume it.
- **No 7-day expansion.** `MealPlan.meals.length === 5`. Sat/Sun rows are not rendered.
- **No "Regenerate preserves thumbs-upped meals"** (design/spec.md §5.2). Current regen behavior stays — a full re-roll. Pinning is deferred to a follow-up.
- **No protein/prep/lastMade backend support.** Mono-metadata row renders only what the synthesis module can derive (e.g., theme-tag descriptor like "Fish" or "Tex-Mex"). When all fields are null, the metadata row is omitted from the row.
- **No DealsSidebar restyle, no GroceryList restyle.** Both stay as today; their Editorial restyle is deferred to Phase 3 along with the Grocery route.
- **No Library, Cadence, Grocery-as-route, Settings, Add Meal modal.** Phase 3.
- **No density toggle, no dark-mode pass.** Phase 4.

### Deferred to Follow-Up Work

- `SwapDrawer` + `swapSuggestions(daySlot)` ranking — separate PR within Phase 2.
- `lastMade` / `protein` / `prep` API support so `CadencePulse` and metadata row become real — depends on `/api/generate-plan` returning richer per-meal metadata.
- Calendar event integration that lights up `EventChip` and skip-night rows — depends on Skylight / iCal / Google work in Phase 3 or later.

---

## Context & Research

### Relevant Code and Patterns

- `src/components/home-page.tsx` — current page client component; the screen-level wiring this PR rewrites.
- `src/components/meal-card.tsx` — current card-grid row; deleted in this PR. `meal-card.test.tsx` deleted alongside.
- `src/components/ui/pill.tsx`, `src/components/ui/eyebrow.tsx`, `src/components/ui/hairline-list.tsx`, `src/components/ui/button.tsx` — primitives shipped in #89 the new components compose.
- `src/lib/plan/types.ts` — `MealPlan` and `MealPlanMeal` shapes; authoritative for what data the page can use.
- `src/lib/plan-ui/use-plan-state.ts` and `state.ts` — `usePlanState()` hook with `regenerate`, `swap`, `setThumb`, `setSkipReason`, `retry`. **No changes to the hook this PR.**
- `src/lib/plan-ui/week.ts` — small existing day-utility module. May absorb the new synthesis or live alongside it; resolved in U1.
- `src/app/page.test.tsx` — server-component test that must be updated for any new data attribute / aria changes the rewritten page exposes.
- `design/spec.md` §2.1, §3.2, §3.3, §3.4, §3.5 — primary design source.
- `design/data-model.ts` — *suggested* type shapes (`DaySlot`, `CalendarEvent`, etc.). Not authoritative; reconcile only what U1 needs.

### Institutional Learnings

- `docs/solutions/build-errors/shadcn-generated-files-not-committed-2026-04-04.md` — pre-merge hygiene reminder. Not directly relevant here, but every new file under `src/components/` and `src/lib/week-ui/` must be staged before pushing.
- No prior learnings on Editorial composition patterns — this PR will be the first source of those. Capture via `/ce-compound` after merge.

### External References

None — all guidance lives in `design/`.

---

## Key Technical Decisions

- **Synthesis lives in `src/lib/week-ui/`, not in components.** Pure functions (`formatWeekRange`, `weekIssueNumber`, `synthesizeDay`) keep the day-row data derivation testable without rendering, and make the eventual API-shape change a single seam to swap.
- **Day-row data shape is local to this PR.** A `DayRowData` type lives in `src/lib/week-ui/types.ts`. It is *not* `design/data-model.ts`'s `DaySlot` — that type assumes API fields we don't have. When the API ships richer data, we revisit; for now the shim's surface is exactly what the renderer needs.
- **HairlineList renders as `<ol>`** since the rows are an ordered sequence (Mon → Fri). Each `<MealRow>` uses `<li>` semantics implicitly via its outer wrapper.
- **`EventChip` is built but not rendered.** Keeping it in scope means SwapDrawer / Calendar integration land cleanly later, and the test suite locks the chip's contract before any consumer arrives. Alternative — defer EventChip to the consumer PR — was considered; rejected because the spec lists EventChip as a Phase 2 deliverable and the component is ~30 lines.
- **`tonightSlot()` highlight is retired.** The Editorial day-row visual hierarchy doesn't have a "tonight" emphasis. We drop the `isTonight` prop and `<Tonight>` ribbon in the same commit that deletes `MealCard`. The page test needs updating for the removed `data-testid="tonight-marker"` and `data-testid="day-label"` attributes — replaced by the new `data-testid="day-row"` on each `<MealRow>`.
- **`CadencePulse` ships with empty-state semantics.** Because `lastMade` is null in this PR, the component takes `daysAgo: number | null` and renders nothing meaningful when null. The visual contract (14-pip layout, mono "Nd ago" caption) is locked by tests; the live data lights up in a follow-up.
- **Theme synthesis is keyword-based, not LLM-driven.** `synthesizeDay` matches: Tuesday + (`taco` || `tex-mex` || `quesadilla` || `fajita` || `enchilada` || `burrito` in title or kidVersion) → `Taco Tuesday`; Friday + (`fish` || `salmon` || `cod` || `tilapia` || `shrimp` || `tuna` || `sushi` || `poke` || `crab` || `scallop` || `halibut` || `mahi` in title) → `Fish Friday`. Wider keyword list than initially scoped — adv-003 review highlighted that the conservative list missed common vocabulary, producing inconsistent pill rendering.
- **Eyebrow date range shows Mon–Sun (the full ISO week)** even though only 5 rows render Mon–Fri. The Eyebrow communicates *the week*; the row list communicates *the planned meals*. They have different referents. A user reading "Apr 27 — May 03" understands the planning horizon; the missing Sat/Sun rows are visible as the absence of those rows. Resolved per design-lens DL5.
- **Mobile breakpoint floor.** The 3-column row (120px / flex / 320px ≈ 460px min content width before gaps) overflows on phones. Floor for this PR: at `< md:` (Tailwind, 768px) the right action column wraps below the meal column; the day-label column stays at 120px on the left. Higher fidelity (e.g., a hamburger-style condensed action row) is Phase 4 polish. Resolved per design-lens DL6.
- **Row-level hover/focus.** MealRow's outer `<li>` is **not interactive**. No row-level hover tint — the action column owns the affordance. This honors design-system.md "paper, not glass" (no full-row tints) and avoids ambiguity about what a row click does. Tab order within a row is thumb-up → thumb-down → Swap (DOM-natural, no `tabIndex` overrides). Resolved per design-lens DL2/DL3.
- **Date "Apr 27" generation is deterministic from the current week.** `synthesizeDay(meal, index, weekStart)` computes `weekStart + index days` and formats as `MMM D`. Week start is "current Monday" via `getMondayOfWeek(today)` in `src/lib/week-ui/dates.ts`.
- **Week issue number** — `weekIssueNumber(date)` returns ISO 8601 week number via the standard "Thursday of the week determines the year" algorithm (hand-rolled — `date-fns` is **not** in `package.json` and we don't add it for this PR). Display format: `Issue 18` (no leading zero). Edge cases handled: week 1 vs 53 boundary, ISO year transitions (e.g., 2025-12-29 is ISO week 1 of 2026, not week 53 of 2025). Rationale for ISO over an app-launch-relative counter: ISO is calendar-derived (no constants to maintain) and aligns with how the existing `currentWeekStart` already computes weeks. If the design author intended a different numbering, replace `weekIssueNumber` (single seam) — the renderer doesn't care.

---

## Open Questions

### Resolved During Planning

- **Render Sat/Sun rows or not?** Resolved: render only the 5 weekday rows the API returns. Sat/Sun is a future API change.
- **Where does theme synthesis live?** Resolved: pure function in `src/lib/week-ui/synthesize.ts` — testable, swappable when richer data arrives.
- **Should `CadencePulse` ship without live data?** Resolved: yes, ships with empty-state semantics so the contract is locked and the consumer wire-up later is a one-line prop addition.
- **Does `EventChip` ship without a rendering callsite?** Resolved: yes, exported with tests so SwapDrawer / Calendar PR can consume directly.
- **Replace MealCard or keep alongside?** Resolved: replace — no callsites remain after wiring, and CLAUDE.md prohibits back-compat shims when a sweep is feasible. `meal-card.tsx` and `meal-card.test.tsx` are deleted in U6.

### Deferred to Implementation

- **Exact pixel widths** of the day-label and right-action columns (120px and 320px per spec) may need to flex on narrower viewports. Verify during U6 wiring; if mobile width is broken, the action column wraps below the meal column at `<sm` breakpoint. Not specced.
- **Mobile breakpoint behavior** for the 3-column row — likely stacks vertically below `md:`. Resolved at unit start by checking the rendered page in `npm run dev`.
- **Whether to replace the existing `tonightSlot()` highlight with anything** at all — possibly an Eyebrow "Today" marker on the active row. Defer; current scope drops the highlight outright per Key Technical Decisions.
- **Empty `kidVersion` styling** — when `kidVersion` is null, no KidNote. When it's an empty string, treat as null (defensive, since the API contract says `string | null`). Confirmed at unit start by checking `MealPlanMeal` consumers.

---

## Implementation Units

- U1. **`src/lib/week-ui/` synthesis module**

**Goal:** Pure-function data derivation for the Week-screen rows. Owns date math, week-issue numbering, and per-day metadata synthesis from `MealPlan` + index. Locks the seam where the future richer-API change will land.

**Requirements:** R11

**Dependencies:** None.

**Files:**
- Create: `src/lib/week-ui/dates.ts` (`getMondayOfWeek`, `formatDayShort`, `formatWeekRange`, `weekIssueNumber`)
- Create: `src/lib/week-ui/synthesize.ts` (`synthesizeDay(meal, index, weekStart)` returning `DayRowData`)
- Create: `src/lib/week-ui/types.ts` (`DayRowData`, `WeekHeaderData`)
- Create: `src/lib/week-ui/index.ts` (re-exports)
- Create: `src/lib/week-ui/dates.test.ts`
- Create: `src/lib/week-ui/synthesize.test.ts`

**Approach:**
- `getMondayOfWeek(today: Date): Date` — given any date, returns Monday of that week (UTC-safe). Sunday rolls back 6 days, not forward 1.
- `formatDayShort(date: Date): string` — returns `"MON"`, `"TUE"`, …, `"FRI"` (uppercase, three letters, mono-ready).
- `formatWeekRange(weekStart: Date): string` — returns `"Apr 27 — May 03"` (MMM D format, em-dash separator). Cross-month boundaries (e.g., `Apr 28 — May 04`) handled naturally.
- `weekIssueNumber(date: Date): number` — ISO 8601 week number. Returns 17 for the example date.
- `synthesizeDay(meal: MealPlanMeal, index: number, weekStart: Date): DayRowData` — returns:
  - `dayKey: "MON" | "TUE" | "WED" | "THU" | "FRI"` — derived from index
  - `dateLabel: string` — e.g., `"Apr 27"`
  - `theme: { tag: "taco-tuesday" | "fish-friday"; label: string } | null` — keyword-matched
  - `kidNote: { who: string; text: string } | null` — derived from `meal.kidVersion`. `who` defaults to `"Kid"` for Phase 2 since family member names are not yet plumbed (deferred to Settings/Family in Phase 3).
  - `metadata: { protein: string | null; prepMinutes: number | null; daysAgo: number | null }` — all null in Phase 2. Reserved for the richer-API change.

**Patterns to follow:**
- `src/lib/plan-ui/week.ts` — small pure-function module pattern. Mirror the export shape.
- `src/lib/plan/types.ts` — type declaration style (interfaces, named exports).

**Test scenarios:**
- Happy path: `getMondayOfWeek(new Date("2026-04-30"))` returns `2026-04-27` (a Thursday → Monday).
- Edge case: `getMondayOfWeek(new Date("2026-05-03"))` (Sunday) returns `2026-04-27` (rolls back, not forward).
- Edge case: `getMondayOfWeek(new Date("2026-04-27"))` (Monday) returns `2026-04-27` (no roll).
- Happy path: `formatWeekRange(new Date("2026-04-27"))` returns `"Apr 27 — May 03"`.
- Edge case: `formatWeekRange(new Date("2025-12-29"))` returns `"Dec 29 — Jan 04"` (year-crossing).
- Happy path: `weekIssueNumber(new Date("2026-04-30"))` returns `18` (ISO 8601 week 18 of 2026 starts Mon Apr 27; matches the R1 example).
- Edge case: `weekIssueNumber(new Date("2026-01-01"))` — verify ISO week 1 vs 53 logic.
- Happy path: `synthesizeDay({ title: "Black bean tacos", kidVersion: null, dealMatches: [] }, 1, weekStart)` returns `{ dayKey: "TUE", theme: { tag: "taco-tuesday", label: "Taco Tuesday" }, kidNote: null, ... }`.
- Happy path: `synthesizeDay({ title: "Salmon with rice", ... }, 4, weekStart)` returns `{ dayKey: "FRI", theme: { tag: "fish-friday", label: "Fish Friday" }, ... }`.
- Edge case: `synthesizeDay({ title: "Sausage skillet", ... }, 1, weekStart)` returns `{ dayKey: "TUE", theme: null, ... }` (Tuesday but no taco match).
- Edge case: `synthesizeDay({ ..., kidVersion: "" }, 0, weekStart)` returns `{ kidNote: null }` (empty string treated as null).
- Edge case: `synthesizeDay({ ..., kidVersion: "use cheese instead" }, 0, weekStart)` returns `{ kidNote: { who: "Kid", text: "use cheese instead" } }`.

**Verification:**
- `npm test -- src/lib/week-ui/` passes.
- All exports are named (no defaults). `npm run build` succeeds.

---

- U2. **Atomic domain components: `ThemePill`, `CadencePulse`, `EventChip`**

**Goal:** Three small components that wrap the `Pill` primitive (and pure JSX for `CadencePulse`) to encode meal-domain visual idioms once, so day-row composition stays declarative.

**Requirements:** R6, R7, R9, R10

**Dependencies:** U1 (`DayRowData` type for `ThemePill` props).

**Files:**
- Create: `src/components/theme-pill.tsx` + `theme-pill.test.tsx`
- Create: `src/components/cadence-pulse.tsx` + `cadence-pulse.test.tsx`
- Create: `src/components/event-chip.tsx` + `event-chip.test.tsx`

**Approach:**
- `ThemePill` — accepts `theme: { tag: "taco-tuesday" | "fish-friday"; label: string }`. Renders `<Pill variant="forest" size="sm">` with an inline icon (lucide `Fish` for fish-friday, custom or lucide fallback for taco-tuesday — `UtensilsCrossed` works as a stand-in until a custom 24×24 stroke icon is drawn). Label is the spec's display string.
- `CadencePulse` — accepts `daysAgo: number | null`. Renders 14 vertical pips left-to-right (oldest → newest): `<div className="flex items-end gap-px h-3">` containing 14 `<span>` children. The **rightmost N** (where N = clamp(`daysAgo`, 0, 14)) are filled `bg-forest` to communicate "N days have elapsed since this meal"; the remaining `14 - N` leftmost pips are `bg-paper-edge`. This matches design/spec.md §3.3 ("The N most-recent days are filled forest"). Trailing `<span class="text-mono-sm text-ink-3 ml-2">{daysAgo}d ago</span>`. When `daysAgo === null`, render an empty placeholder with `aria-hidden="true"` and `visibility: hidden` (a single `<span class="invisible" aria-hidden="true" />` sized to the same width) so layout reserves space without exposing 14 silent pip elements to screen readers.
- `EventChip` — accepts `event: { kind: "soccer" | "dinner-out" | "work" | "travel" | "other"; label: string; impact: "skip" | "quick-meal" | "shift-time" | "none" }`. Maps `impact: "skip"` → `<Pill variant="slate" size="sm">`; everything else → `<Pill variant="amber" size="sm">`. Icon is mapped from `kind` via lucide (`UsersRound` / `Soup` / `Briefcase` / `Plane` / `Calendar`). Component is built but **not rendered in this PR** — exports + tests lock the contract.

**Execution note:** Test-first for each component's variant/icon mapping; the visual shape is small and deterministic so scenarios can be enumerated up front.

**Patterns to follow:**
- `src/components/ui/pill.tsx` — composition target.
- `lucide-react` icons from existing imports (`RefreshCw`, `ThumbsUp`, etc. live in `home-page.tsx` and `meal-card.tsx`).

**Test scenarios:**
- ThemePill happy: `<ThemePill theme={{ tag: "taco-tuesday", label: "Taco Tuesday" }} />` renders `Pill` with `bg-forest-soft`, displays "Taco Tuesday", and includes an SVG icon prefix.
- ThemePill happy: tag `fish-friday` renders the fish icon and "Fish Friday".
- CadencePulse happy: `<CadencePulse daysAgo={3} />` renders 14 pip elements; the **rightmost 3** carry `bg-forest` (newest end) and the leftmost 11 carry `bg-paper-edge`; trailing caption reads `"3d ago"`.
- CadencePulse edge: `daysAgo={0}` — all 14 pips paper-edge (no time elapsed → no fill), caption `"0d ago"`.
- CadencePulse edge: `daysAgo={14}` — all 14 pips forest, caption `"14d ago"`.
- CadencePulse edge: `daysAgo={20}` — clamped to all 14 forest, caption `"20d ago"` (the count is informational beyond the visual range).
- CadencePulse edge: `daysAgo={null}` — renders an `aria-hidden="true"` invisible placeholder with no caption text and no pip elements exposed to assistive technology; layout still occupies the same height/width.
- EventChip happy: `impact: "skip"` renders slate pill; `impact: "quick-meal"` renders amber pill; both include the `kind`-mapped icon.
- EventChip happy: every `kind` enum produces an SVG icon (no `null` icon paths).

**Verification:**
- `npm test -- src/components/theme-pill.test.tsx src/components/cadence-pulse.test.tsx src/components/event-chip.test.tsx` passes.

---

- U3. **`KidNote` component**

**Goal:** Replace the current `🧒` accent box on meal cards with the spec'd amber-tile KidNote (name pill on left, free text on right). Used only when `meal.kidVersion !== null`.

**Requirements:** R8, R10, R15

**Dependencies:** None directly; composes `Pill` from `src/components/ui/pill.tsx`.

**Files:**
- Create: `src/components/kid-note.tsx` + `kid-note.test.tsx`

**Approach:**
- Accept `note: { who: string; text: string }` per `design/spec.md` §3.2.
- Render an `amber-soft` background tile with the name pill (`<Pill variant="amber" size="sm">{who}</Pill>`) on the left and the free-text body on the right (`text-body-sm text-amber-ink`). Compose via flex.
- Wrap the whole tile in a small bordered container — `bg-amber-soft text-amber-ink rounded-sm p-2 flex items-center gap-2`.

**Patterns to follow:**
- The Editorial palette pair `amber-soft` / `amber-ink` — already a standard pairing (see `Pill` amber variant).

**Test scenarios:**
- Happy path: `<KidNote note={{ who: "Iris", text: "use cheese instead" }} />` renders a Pill with text "Iris" and a separate text node "use cheese instead".
- Happy path: container className contains `bg-amber-soft` and `text-amber-ink`.
- Edge case: empty `text` renders the name pill only, no text node (or both with no error — confirm at unit start).

**Verification:**
- `npm test -- src/components/kid-note.test.tsx` passes.

---

- U4. **`DayLabel` component**

**Goal:** The 120px-wide day-label column. Mono day abbrev (`MON`) over an `Apr 27` date, with optional `<ThemePill>` underneath.

**Requirements:** R3, R10

**Dependencies:** U1 (`DayRowData` shape), U2 (`ThemePill`).

**Files:**
- Create: `src/components/day-label.tsx` + `day-label.test.tsx`

**Approach:**
- Accept `{ dayKey, dateLabel, theme }` from `DayRowData`.
- Render a column `flex flex-col gap-1 w-[120px] flex-none`. Day abbrev: `<span className="text-mono-sm text-ink-2">MON</span>`. Date: `<span className="text-mono-sm text-ink-3">Apr 27</span>`. ThemePill below when `theme !== null`.

**Patterns to follow:**
- `src/components/ui/eyebrow.tsx` for the mono-uppercase styling (though we don't need full eyebrow tracking here; mono-sm is enough).

**Test scenarios:**
- Happy path: `<DayLabel dayKey="MON" dateLabel="Apr 27" theme={null} />` renders "MON" and "Apr 27" text nodes, no ThemePill.
- Happy path: with `theme={{ tag: "taco-tuesday", label: "Taco Tuesday" }}`, ThemePill renders below.
- Edge case: `dayKey="FRI" theme={fish-friday}` renders "FRI" and the fish-friday pill.

**Verification:**
- `npm test -- src/components/day-label.test.tsx` passes.

---

- U5. **`MealRow` composer**

**Goal:** The full Editorial day row — three columns composed from `DayLabel`, `ThemePill`, `CadencePulse`, `KidNote`, optional `EventChip`, plus the action column (thumb-up / thumb-down toggle, Swap button).

**Requirements:** R2, R4, R5, R8, R10, R15

**Dependencies:** U1, U2, U3, U4. Composes existing primitives `Button`, `Pill`.

**Files:**
- Create: `src/components/meal-row.tsx` + `meal-row.test.tsx`

**Approach:**
- Accepts `{ row: DayRowData; meal: MealPlanMeal; index: number; thumb: Thumb; isSwapping: boolean; onSwap; onThumbsUp; onThumbsDown }`.
- Layout: outer `<li className="flex items-start gap-6 py-5">` with three column children.
  - Col 1: `<DayLabel {...row} />`
  - Col 2: meal block — `<h2 className="text-h2 text-ink">{meal.title}</h2>`, then a metadata row (omitted when all of `protein` / `prepMinutes` / `daysAgo` are null), then `<KidNote>` when `row.kidNote`. EventChip rendering is deferred (no event data this PR).
  - Col 3: `flex items-center gap-1 w-[320px] flex-none ml-auto justify-end` — thumb-up button (`<Button variant={thumb === "up" ? "primary" : "ghost"} size="icon" aria-label="Thumbs up">`), thumb-down (with the rose-ink override on active per #89's meal-card pattern), then `Swap meal` ghost button (`size="sm"`).
- Skip-night branch (component-internal but unreached this PR): if `row.event?.impact === "skip"`, render meal slot as `<span className="italic text-ink-3">No dinner planned</span>` with EventChip below; replace col 3 with a single `<Button variant="ghost" size="sm">Plan a meal</Button>`. Tests cover the branch via a fixture even though no live data triggers it.
- The thumbs-down rose-ink override pattern is preserved verbatim from current `meal-card.tsx` so the rose-ink intent stays intact.

**Patterns to follow:**
- `src/components/meal-card.tsx` — current row's button wiring (thumbs + Swap with `aria-pressed`, `aria-label`, `disabled`).
- `src/components/ui/hairline-list.tsx` — wrapping at the parent level (see U6).

**Test scenarios:**
- Happy path: renders meal title as `<h2>` with `text-h2` class.
- Happy path: with `row.kidNote`, KidNote renders below the title.
- Happy path: with `row.theme`, DayLabel includes ThemePill.
- Happy path: thumb-up button has `aria-pressed="true"` when `thumb === "up"` and uses `variant="primary"`; otherwise `aria-pressed="false"` and `variant="ghost"`.
- Happy path: thumb-down with `thumb === "down"` carries the rose-ink override className.
- Happy path: clicking thumb-up calls `onThumbsUp(index)`.
- Happy path: clicking Swap calls `onSwap(index)`.
- Edge case: `isSwapping={true}` disables the Swap button and shows "Swapping…" copy.
- Edge case: skip-night fixture (`row.event = { kind: "soccer", label: "Iris's soccer", impact: "skip" }`) renders "No dinner planned" italic, EventChip below, single `Plan a meal` button instead of the thumbs+Swap trio.
- Integration: passing a metadata-empty row omits the metadata mono row entirely (no orphan separator, no empty mono span).

**Verification:**
- `npm test -- src/components/meal-row.test.tsx` passes.

---

- U6. **Wire the Editorial layout into `home-page.tsx`; delete `MealCard`**

**Goal:** Replace the current header row + `<MealCard>` grid in `src/components/home-page.tsx` with the Editorial Week hero + `<HairlineList as="ol">` of `<MealRow>` rows. Delete `src/components/meal-card.tsx` and its test. Update `src/app/page.test.tsx` for the new test ids and removed `tonight-marker` / `day-label` attributes.

**Requirements:** R1, R2, R5, R10, R13, R14, R15

**Dependencies:** U1, U2, U3, U4, U5.

**Execution note:** Adapt `src/app/page.test.tsx` first — make assertions reflect the Editorial DOM. Then delete `MealCard` + `meal-card.test.tsx`. Then rewrite `home-page.tsx`. Run the full suite after each step so cascading failures surface early.

**Files:**
- Modify: `src/components/home-page.tsx`
- Modify: `src/app/page.test.tsx`
- Delete: `src/components/meal-card.tsx`
- Delete: `src/components/meal-card.test.tsx`

**Approach:**
- `home-page.tsx` becomes:
  - Hero header at the top: `<Eyebrow>{formatWeekRange(weekStart)} · Issue {weekIssueNumber(weekStart)}</Eyebrow>`, `<h1 className="text-display text-ink">This week, we're cooking.</h1>`, right-side action group (`Regenerate` ghost + conditional `Email this`).
  - `<HairlineList as="ol" className="border-t border-paper-edge">` wrapping `plan.meals.map((meal, i) => <MealRow row={synthesizeDay(meal, i, weekStart)} ... />)`.
  - DealsSidebar unchanged. GroceryList unchanged. Skip-reason input section unchanged.
  - Drop `tonightSlot()` and the `isTonight` prop entirely.
- Page CSS: outer container max-width remains `max-w-7xl`. Page-x padding from layout stays (`px-4`). Phase 4 polish may revisit per spec's `64px` page-x.
- `src/app/page.test.tsx`: the existing test selects meal items via `screen.getAllByLabelText(/Meal \d:/)` (the `aria-label` set by `<MealCard>`). After deleting `MealCard`, this selector returns nothing. **Decision:** preserve the assertion's intent by setting `aria-label={`Meal ${index + 1}: ${meal.title}`}` on each `<MealRow>` outer `<li>` — keeps `getAllByLabelText(/Meal \d:/)` selecting 5 elements without changing the test, and gives screen readers a row-level summary. Add an Eyebrow text assertion (`/Apr 27 — May 0[12]/` regex tolerates Mon-Sun vs Mon-Fri range — see DL5 resolution). Use `vi.useFakeTimers()` + `vi.setSystemTime(new Date("2026-04-30T12:00:00Z"))` at test setup to pin the clock so the Eyebrow assertion is stable.
- `meal-card.test.tsx` is deleted — its assertions are now covered by `meal-row.test.tsx` (U5).

**Patterns to follow:**
- The current `home-page.tsx` skeleton — keep `ErrorState` and `usePlanState` wiring untouched. **Restate `LoadingState`** for the Editorial layout: replace the `grid gap-4 sm:grid-cols-2 xl:grid-cols-3` of five card-shaped Skeletons with a Skeleton sized for the display-title hero followed by a `<HairlineList as="ol">` of five row-height Skeletons (~h-20 each), so the loading shape matches the resolved shape.
- `src/lib/plan-ui/use-plan-state.ts` — no changes; consume the same hook with the same return shape.

**Test scenarios:**
- Page-test: with the demo `MealPlan` fixture, the Eyebrow renders the correct week range.
- Page-test: the rendered DOM contains 5 `<MealRow data-testid="day-row">` elements.
- Page-test: clicking thumb-up on row index 2 calls the same `setThumb` path that currently exists (no behavior regression).
- Page-test: `Regenerate plan` button triggers `regenerate()` and disables itself with the spinner.
- Page-test: when `emailEnabled={false}` the `Email this` button is hidden.
- Edge case: with no `kidVersion` on any meal, no KidNote chips render anywhere on the page.
- Edge case: at least one meal with `kidVersion` renders a KidNote in that row.

**Verification:**
- `npm test` (full suite) passes.
- `npm run build` succeeds.
- `npm run lint` clean.
- Manual `npm run dev`: Week hero matches design/spec.md §2.1 visually at desktop. Mobile fallback is acceptable (rows may stack); the spec's exact mobile breakpoint is deferred to Phase 4 polish.

---

## System-Wide Impact

- **Interaction graph:** No new entry points. The page consumes the same `usePlanState` hook with the same callbacks (`regenerate`, `swap`, `setThumb`, `setSkipReason`).
- **Error propagation:** Unchanged. The `ErrorState` shell stays as-is. `LoadingState` is **restated** for the Editorial layout (display-title-height Skeleton above an `<ol>` of five row-height Skeletons separated by hairlines) so the loading shape matches the rendered shape and the resolve transition isn't jarring.
- **State lifecycle risks:** None — the rewrite is presentational. No new persistence, no new async, no new effects.
- **API surface parity:** No backend changes. `MealPlan` shape is consumed exactly as it ships today. Future API changes for `protein`/`prepMinutes`/`lastMade`/`event` will replace the synthesis module's outputs without touching the renderer.
- **Integration coverage:** No Cypress e2e specs exist in this repo today (`cypress/e2e/` directory is empty — only `cypress/support/` and `cypress/fixtures/` are present). E2E coverage for the Editorial home page is deferred to a follow-up PR; this PR ships with Vitest + RTL coverage only and a `npm run dev` manual smoke during U6.
- **Unchanged invariants:**
  - `usePlanState()` and `state.ts` reducer untouched.
  - `MealPlan` and `MealPlanMeal` types untouched.
  - `DealsSidebar`, `GroceryList`, `EmailButton` untouched.
  - All API routes untouched.
  - Editorial primitives from #89 untouched (consumed only).
  - Token layer from #87 untouched.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Synthesizing day metadata client-side will read as a hack to future maintainers. | Module is named `src/lib/week-ui/` (clear "shim" scope), top of `synthesize.ts` carries a "Phase 2 shim — replace when API returns richer per-meal metadata" comment, and the function returns nullable fields explicitly so the seam is obvious. |
| `CadencePulse` ships without live data; visual contract may drift before a consumer arrives. | Tests lock the pip-count + caption-format contract. Storybook isn't in scope, but a temporary scratch page during dev can spot-check. |
| Replacing `MealCard` in one commit is invasive — page tests must update simultaneously. | U6 execution note prescribes adapting `page.test.tsx` first, then deleting `MealCard`, then rewriting `home-page.tsx`, with a full suite run after each step. |
| `EventChip` ships without a callsite and could rot. | Tests lock its variant/icon contract. SwapDrawer / Calendar PRs (separate) consume it; if the contract drifts, those PRs surface the regression. |
| Mobile breakpoint behavior at `<md:` may break the 3-column row. | Verified during U6 manual `npm run dev` smoke. Acceptable degradation: rows stack vertically below `md:`. Polish in Phase 4. |
| `weekIssueNumber` ISO-8601 edge cases (year boundaries, week 53 years) could miscount. | Unit tests cover the 2025→2026 year transition and the 2026 calendar's actual ISO weeks. If a real-world miscount surfaces, swap to `date-fns` (already in the dependency tree? — confirm at unit start; if not, hand-roll with comments). |
| First Editorial-layout PR with no e2e coverage at all (no specs in `cypress/e2e/`). | Acceptable for this PR; add e2e coverage in a follow-up alongside the SwapDrawer / Calendar PR. Vitest + RTL tests (U1–U6) plus the U6 manual `npm run dev` smoke are the verification surface. |

---

## Documentation / Operational Notes

- No env vars, no rollout, no monitoring changes.
- No `docs/design-system.md` update required — primitive set is unchanged from #89.
- After merge, run `/ce-compound` to capture: (a) the synthesis-module shim pattern, (b) the Editorial day-row composition recipe (`HairlineList as="ol"` + `MealRow` composing `DayLabel` + meal block + action triplet), and (c) `weekIssueNumber` edge-case handling.
- Open follow-up issues for: SwapDrawer (umbrella item 7), API enrichment for `lastMade`/`protein`/`prepMinutes`, calendar event integration that lights up `EventChip`.

---

## Sources & References

- **Origin design handoff:** `design/spec.md` §2.1 (Week screen), §3.2 (KidNote), §3.3 (CadencePulse), §3.4 (EventChip), §3.5 (Standard buttons). `design/design-system.md` §"Type system" / §6. `design/tokens.json`.
- **Tracking issue:** [#86 — UI makeover: adopt Editorial design system](https://github.com/dancj/meal-assistant/issues/86) (Phase 2 items 4–6).
- **Predecessor PRs:** #87 (tokens), #89 (primitives).
- **Related code:**
  - `src/components/home-page.tsx`, `src/components/meal-card.tsx` (delete target), `src/lib/plan-ui/`, `src/lib/plan/types.ts`
  - `src/components/ui/{pill,eyebrow,hairline-list,button}.tsx` (consumers of #89's primitives)
- **External docs:** None — design system is the authority.
