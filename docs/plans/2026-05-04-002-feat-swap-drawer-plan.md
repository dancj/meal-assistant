---
title: "feat: SwapDrawer (Phase 2 of #86, item 7)"
type: feat
status: active
date: 2026-05-04
origin: design/spec.md  # §3.1 SwapDrawer
---

# feat: SwapDrawer (Phase 2 of #86, item 7)

## Overview

Replace the current "Swap meal" button-as-trigger-for-full-regeneration flow with the spec'd Editorial **SwapDrawer**: a 420px right-side drawer of three ranked, swap-in-place suggestions. Closes umbrella issue #86 item 7 and lights up the Phase 2 components shipped without consumers (`CadencePulse` foremost) by giving them a real callsite.

Today, clicking `Swap meal` on a `<MealRow>` calls `/api/generate-plan` and replaces the slot with `meals[0]` of the new plan. After this PR, the click opens a drawer; the in-memory `recipes` and `recentLogs` are ranked client-side; the user picks one of three; the slot is replaced **locally** and the drawer closes. No new API.

---

## Problem Frame

The Editorial spec defines swap as a deliberate, browseable choice — three ranked options with cadence and protein context — not a slot-machine re-roll that hides intent behind a single button. The current re-roll approach also wastes a Claude call per swap and produces a different meal each click with no user agency over the pool.

Two reality constraints shape the plan:

1. **`Recipe` has only `{ title, tags, kidVersion, content, filename }`.** No `protein`, `prep`, `themes`, or `lastMade` fields. Suggestion metadata (protein pill, cadence pulse) must be **synthesized client-side** from `tags` + `title` keyword matching plus `recentLogs[].cooked` lookup. Same Phase 2 shim shape as `src/lib/week-ui/`.
2. **`prep` is not derivable from any current shape.** The spec lists prep as a slate pill on suggestion cards. Phase 2 omits the prep pill entirely; the layout reserves space only for the pills it can populate. Phase 3's API enrichment lights it up.

The drawer must also cleanly handle the side effect today's swap covers as a freebie: the **grocery list**. Today's `SWAP_OK` reducer takes the regenerated plan's grocery list verbatim. After the local-only swap, the grocery list reflects the *previous* meal in that slot until the user clicks Regenerate. Decision recorded in Key Technical Decisions; signaled via a small "Grocery list out of date — Regenerate to refresh" hint when the swap diverges from the current grocery state.

---

## Requirements Trace

### SwapDrawer behavior

- R1. **Trigger.** Clicking `Swap meal` on a `<MealRow>` opens the drawer for that row's slot. The button no longer triggers `/api/generate-plan`. *(design/spec.md §3.1, §2.1 col 3)*
- R2. **Header.** Eyebrow with `{dayKey} · {dateLabel}` (e.g., `TUE · Apr 28`), `<h3>Choose a swap</h3>`, caption `Replacing: {currentMealTitle}`, close button. *(design/spec.md §3.1)*
- R3. **Body.** Eyebrow `<Eyebrow><Sparkles /> Fits your rules</Eyebrow>` followed by a `<HairlineList>` of up to 3 `<SwapSuggestion>` buttons. *(design/spec.md §3.1)*
- R4. **Suggestion content.** Each suggestion shows: meal name as `<h4>` (`text-h3` is too large; use `text-h2/0.85` or a new mono-h4 — resolved in U2), slate `<Pill>`s for available metadata (protein when derivable; **prep pill is omitted** in Phase 2), and `<CadencePulse daysAgo={...} />`. *(design/spec.md §3.1)*
- R5. **Selection.** Tapping a suggestion replaces the meal in `state.plan.meals[index]` with the chosen recipe and closes the drawer (220ms reverse animation, already configured on `<DrawerBackdrop>` and `<DrawerContent>`). *(design/spec.md §3.1)*
- R6. **Empty / few state.** When the ranker returns 0 suggestions (every recipe is already in this week's plan or the recipe pool is too small), the drawer body shows a plain `text-body-sm text-ink-3` "No swaps available — your week already uses every recipe." When it returns 1–2 suggestions, render only those (no padding placeholders). *(spec doesn't enumerate; resolved in U3)*

### Suggestion ranking

- R7. **Exclude in-week duplicates.** Filter out any recipe whose `title` matches a meal currently in `state.plan.meals` (other than the slot being swapped — the current meal is implicitly excluded because it's in the plan). Match is case-insensitive trimmed equality. *(design/spec.md §3.1 ranking item 1)*
- R8. **Theme boost.** When the slot's synthesized `theme.tag` is non-null (e.g., `"taco-tuesday"` for index=1, `"fish-friday"` for index=4), boost recipes whose `tags` array contains that exact tag string OR whose title matches the corresponding theme keyword set (taco/fish keywords from `src/lib/week-ui/`). *(design/spec.md §3.1 ranking item 2)*
- R9. **Protein-rotation boost.** Boost recipes whose synthesized protein differs from the current slot meal's synthesized protein. When either side's protein is unknown (`null`), no boost or penalty — neutral. *(design/spec.md §3.1 ranking item 3)*
- R10. **Top 3.** After applying boosts, return at most the top 3 by score. Tie-break by `recipe.title` ascending so output is deterministic. *(design/spec.md §3.1 ranking item 5)*
- R11. **Future weight (deferred).** Family-member like/dislike weighting is explicitly out of scope (`design/spec.md §3.1 ranking item 4` says "currently not factored"). Ranker leaves a comment placeholder; no code path. *(design/spec.md §3.1 ranking item 4)*

### Implementation discipline

- R12. **Reuse Phase 2 components.** `<Drawer>` family from `src/components/ui/drawer.tsx`, `<HairlineList>`, `<Pill>`, `<Eyebrow>`, refreshed `<Button>`, **and `<CadencePulse>`** (which has zero in-page consumers today and was flagged by autofix review). SwapDrawer is its first real consumer.
- R13. **Synthesis lives in `src/lib/swap-ui/`.** Pure functions: `extractProtein(recipe): string | null`, `extractTags(recipe): string[]`, `lastMadeDays(recipe, recentLogs, weekStart): number | null`, `swapSuggestions(slotIndex, currentMeal, allRecipes, allMeals, recentLogs, weekStart): RankedSuggestion[]`. Mirrors the `src/lib/week-ui/` shim shape — clear "Phase 2 shim" comment at the top of the module. Domain components live in `src/components/`.
- R14. **State machine extension.** Add `swapTarget: number | null` to the ready state and three actions (`OPEN_SWAP_DRAWER`, `CLOSE_SWAP_DRAWER`, `APPLY_SWAP_LOCAL`). The existing `swap()` callback's call to `generatePlan()` is **deleted** — `swap(index)` now dispatches `OPEN_SWAP_DRAWER`. A new `applySwap(index, recipe)` callback dispatches `APPLY_SWAP_LOCAL`. The current `SWAP_STARTED`/`SWAP_OK`/`SWAP_FAILED` actions and `generating` toggle for swap are removed; `generating` continues to gate full regeneration.
- R15. **TDD per CLAUDE.md `meal-assistant:tdd-vitest`** for behavior. Pure styling skips TDD. State machine, ranker, and component event-handler logic are behavior; pure JSX layout is styling.
- R16. **No backend changes.** No API route changes, no env vars, no `MealPlan` shape change. The `swap()` flow's previous `/api/generate-plan` call is removed entirely; `applySwap` is purely client-side state mutation.
- R17. **Accessibility.** Drawer uses `<DialogPrimitive>` from `@base-ui/react` (already wired in `drawer.tsx`) — focus trap, Esc-to-close, backdrop click-to-close handled by the primitive. `<SwapSuggestion>` is a real `<button type="button">` (not a clickable `<div>`). Title is `<DrawerTitle>` (announces as h3). Close button has `aria-label="Close"`. Keyboard tab order: close → suggestion 1 → suggestion 2 → suggestion 3.

### Address residual review findings from #90

- R18. **MealRow callback grouping.** Group the three callbacks into `actions: { onSwap, onThumbsUp, onThumbsDown }` per the [P3] residual finding from `feat-editorial-week-screen.md` — SwapDrawer adds the trigger/apply pair, which would push prop count to 11+ if left flat. *(residual finding: kieran-typescript)*
- R19. **MealRow test coverage gaps.** Add the two missing tests called out in residual findings: thumbs-down click dispatches `actions.onThumbsDown(index)`, and a disabled `Swap` button does not fire `actions.onSwap`. Migrate to the new `actions` shape simultaneously. *(residual finding: testing)*
- R20. **CadencePulse `daysAgo` tagged-union refactor.** The current `daysAgo: number | null` encoding can't distinguish "never cooked" from "data not yet available." Refactor to `state: { kind: "unknown" } | { kind: "never" } | { kind: "days"; n: number }` per the [P3] kieran-typescript residual. SwapDrawer is the first real consumer and emits `"never"` when no log entry matches and `"days"` otherwise; `"unknown"` is reserved for future API-pending callers. *(residual finding: kieran-typescript)*

---

## Scope Boundaries

- **No API changes.** No new endpoint, no `/api/generate-plan` modification, no `MealPlan` shape change.
- **No grocery-list refresh after swap.** The grocery list is computed from the meals at generation time; after a local swap it's slightly stale. A small visible hint signals this; clicking `Regenerate plan` regenerates the whole plan (current behavior). Server-side per-slot grocery-list recompute is deferred.
- **No prep-time pill.** Recipe shape has no `prep` field. The spec's "slate pills: protein, prep time" reduces to "protein only" in Phase 2; Phase 3 API enrichment restores it.
- **No suggestion ranking weighting on family-member likes/dislikes.** `design/spec.md §3.1` item 4 explicitly says "currently not factored." Comment placeholder only.
- **No `<EventChip>` rendering inside SwapDrawer.** EventChip is built and tested but no event data flows from the API; same status as on the Week screen rows.
- **No 7-day expansion.** The drawer is opened from a `<MealRow>` row, of which there are exactly 5 (Mon–Fri).
- **No animation overrides.** The drawer's 220ms slide-in / fade-in is already configured in `src/components/ui/drawer.tsx` (Phase 2 #89 work). `prefers-reduced-motion` will be addressed across the app in Phase 4 polish.

### Deferred to Follow-Up Work

- **Server-side grocery-list refresh after a local swap** — depends on a new endpoint or a Claude-side reroll that pins all-but-one slot. File as a follow-up before Phase 3 grocery route work.
- **Prep-time pill on suggestions** — depends on `/api/generate-plan` (or `/api/recipes`) returning a structured `prep: number` per recipe. Picks up automatically when R7's residual is addressed in API enrichment.
- **Family-member rule weighting** — depends on Phase 3 Settings (Family pane).
- **EventChip rendering** — depends on Skylight / iCal / Google calendar integration.

---

## Context & Research

### Relevant Code and Patterns

- `src/components/ui/drawer.tsx` — `<Drawer>`, `<DrawerContent>`, `<DrawerHeader>`, `<DrawerTitle>`, `<DrawerDescription>`, `<DrawerBody>`, `<DrawerClose>`. Already wired to `@base-ui/react`'s Dialog primitive — focus trap, Esc, slide-in/fade-out animation. Width prop defaults to 420 (matches spec).
- `src/components/cadence-pulse.tsx` + `cadence-pulse.test.tsx` — the unconsumed component and its 6 tests. SwapDrawer is its first real consumer; tagged-union refactor (R20) lands here.
- `src/components/meal-row.tsx` + `meal-row.test.tsx` — the trigger surface. Callback grouping (R18) and test coverage (R19) land here.
- `src/lib/week-ui/index.ts` — same shim pattern this PR mirrors (`src/lib/swap-ui/`). Particularly: `synthesizeDay`'s theme keyword lists (TACO_KEYWORDS, FISH_KEYWORDS) — re-exported and reused in U1's protein/theme matching.
- `src/lib/plan-ui/state.ts` + `use-plan-state.ts` — state machine and hook to extend. Specifically the `SWAP_STARTED` / `SWAP_OK` / `SWAP_FAILED` actions are deleted in U4; new `OPEN_SWAP_DRAWER`, `CLOSE_SWAP_DRAWER`, `APPLY_SWAP_LOCAL` replace them.
- `src/lib/plan/types.ts` — `MealPlan`, `MealPlanMeal`, `REQUIRED_MEAL_COUNT = 5` invariant.
- `src/lib/recipes/types.ts` — `Recipe { title, tags, kidVersion, content, filename }`.
- `src/lib/log/types.ts` — `MealLog { week, cooked, skipped, skipReason? }`. `cooked` is an array of recipe titles; ranker matches `recipe.title` against these.
- `src/components/home-page.tsx` — page-level wiring; mounts `<SwapDrawer>` controlled by `state.swapTarget`.
- `src/components/ui/pill.tsx`, `eyebrow.tsx`, `hairline-list.tsx` — primitives the suggestion list composes.
- `design/spec.md §3.1` — primary design source.
- `docs/residual-review-findings/feat-editorial-week-screen.md` — residual findings list addressed by R18, R19, R20.

### Institutional Learnings

- `docs/solutions/architecture/state-machine-thumbs-skipnight-2026-04-26.md` (if exists; check at unit start) — the existing reducer pattern. SwapDrawer extends the same reducer in the same style.
- `docs/solutions/architecture/phase2-shim-week-ui-2026-05-04.md` (capture-after-merge from `feat-editorial-week-screen`) — the shim-naming + "Phase 2 shim" comment pattern. Mirror it.
- No prior learnings on swap-suggestion ranking — capture via `/ce-compound` after merge.

### External References

None. All guidance lives in `design/`.

---

## Key Technical Decisions

- **Apply swap as a local state mutation, not a re-generation.** `applySwap(index, recipe)` dispatches `APPLY_SWAP_LOCAL` and the reducer replaces `state.plan.meals[index]` with `{ title: recipe.title, kidVersion: recipe.kidVersion, dealMatches: [] }`. This preserves the user's other 4 meals exactly, eliminates a Claude call per swap, and removes the slot-machine UX. Trade-off: the grocery list is stale until full regen. Mitigated by a small "Grocery list out of date" hint visible on `GroceryList` whenever `state.plan.meals` has been mutated since last full generate. Not mitigated by partial recompute — that's deferred follow-up work.
- **`dealMatches: []` after a local swap.** Deal matching is computed by Claude during `/api/generate-plan`. Since we don't re-run that, the swapped meal carries no deal matches; this is honest about the data we have rather than guessing. Phase 3 API enrichment can add a deal-matching pass on swap.
- **Synthesis module name is `src/lib/swap-ui/`.** Distinct from `src/lib/week-ui/` because the inputs differ (week-ui takes a single meal+index; swap-ui takes the full recipe pool, current week, and recent logs). Both are Phase 2 shims and both will be replaced by API enrichment; keeping them separate avoids cross-contamination of unrelated semantics.
- **Protein extraction is keyword-based, recipe-tag-first.** `extractProtein(recipe)` first scans `recipe.tags` for exact protein keywords (`fish`, `chicken`, `beef`, `pork`, `turkey`, `shrimp`, `vegetarian`, `vegan`); if none match, falls back to scanning `recipe.title` for the same keywords plus their species (`salmon` → fish, `cod` → fish, `tofu` → vegetarian, `black bean` → vegetarian, `lentil` → vegetarian). Returns `null` when nothing matches — the suggestion renders without a protein pill rather than guessing. Reused for: ranking (R9), suggestion display (R4).
- **Theme boost reads `recipe.tags` for the literal theme tag and falls back to keyword matching.** Both paths exist because (a) tag conventions in the recipe repo are loose ("dinner", "weeknight" — not always normalized to `taco-tuesday`), and (b) reusing `src/lib/week-ui/`'s TACO_KEYWORDS / FISH_KEYWORDS keeps the theme-detection rule single-sourced. Score increment for theme match is `+10`; protein-rotation match is `+5`. Numeric weights are local to `src/lib/swap-ui/rank.ts` with a top-of-file rationale comment so they're tunable without redesign.
- **`lastMadeDays` walks `recentLogs` newest-first.** Each `MealLog.cooked: string[]` is searched for `recipe.title` (case-insensitive trimmed match). First (newest) hit wins; `daysAgo = floor((weekStart.getTime() - new Date(log.week).getTime()) / 86_400_000)`. Returns `null` when no match — the `<CadencePulse>` then renders the `"never"` tagged-union state per R20.
- **`CadencePulse` API change is breaking.** Changing `daysAgo: number | null` to `state: { kind: "unknown" } | { kind: "never" } | { kind: "days"; n: number }` breaks the prop interface. Since the component has zero current consumers (autofix review confirmed), this is safe — the only callers are SwapDrawer (built fresh in this PR) and the existing tests (rewritten in U2's pre-step). No migration shim needed. Rationale: a deployment-state field (`null` = "data not yet available") shouldn't share encoding with a domain-state field (no log match = "never cooked"); the spec's "Nd ago" caption needs the third state to render correctly.
- **Suggestion `<button>` shape.** The whole suggestion is one `<button type="button" onClick={() => onSelect(recipe)}>` containing the h4, pills, and CadencePulse — not a card with a separate "Choose" CTA. Matches spec ("Tapping a suggestion replaces the meal"). Hairline divider between suggestions comes from `<HairlineList>` parent, not per-button bottom border.
- **Drawer mounts at page level, not at row level.** `home-page.tsx` renders one `<SwapDrawer>` whose `open` is controlled by `state.swapTarget !== null`. Each `<MealRow>`'s `actions.onSwap(index)` dispatches `OPEN_SWAP_DRAWER` with the row's index. Reasoning: only one drawer can be open at a time, so a singleton mount avoids per-row state and DOM bloat (5 portals).
- **MealRow's `actions` prop is the new shape.** All three callbacks (`onSwap`, `onThumbsUp`, `onThumbsDown`) are grouped into a single `actions` object. R18 cites the residual finding directly. The change is internal to `home-page.tsx` and `meal-row.test.tsx`; no other callers exist.
- **Page test for the drawer interaction.** `src/app/page.test.tsx` adds: clicking row 1's Swap button surfaces a drawer with role `dialog` and `<DrawerTitle>` "Choose a swap"; clicking the first suggestion mutates the rendered title in row 1 and dismisses the drawer. Async assertions use `findByRole` (RTL's promise-based matcher) since `@base-ui/react` portals the drawer asynchronously.

---

## Open Questions

### Resolved During Planning

- **What replaces the current re-roll behavior of `swap()`?** Resolved: removed entirely. `swap(index)` now opens the drawer. The chosen suggestion is applied locally; full regen is the user's separate `Regenerate plan` button.
- **How is `prep` shown when not derivable?** Resolved: omit the prep pill in Phase 2. Layout only renders pills it can populate.
- **Where does suggestion data come from?** Resolved: `state.recipes` (already loaded at page mount via `fetchRecipes()`). No new API call.
- **How does the user know the grocery list is stale?** Resolved: add a small `text-mono-sm text-ink-3` hint above `<GroceryList>` when `state.plan.meals` has mutated since the last full regenerate, with a "Regenerate to refresh" inline link that calls the existing `regenerate()` action.
- **Does `CadencePulse` API change land in this PR or as its own?** Resolved: in this PR. SwapDrawer is the first real consumer; bundling the refactor avoids a separate, consumer-less API change PR.

### Deferred to Implementation

- **Sparkle icon source.** Lucide ships `Sparkles`. Confirm import works in the existing setup at U3 unit start; fallback to `Star` if a stroke-weight mismatch is visible against the Editorial system.
- **Exact `<h4>` typography token.** `text-h2` is for meal titles on rows; suggestions need something smaller. Resolved at U2 unit start by checking `src/app/globals.css` for an `h4` token; if absent, use `text-lg font-semibold tracking-tight` inline. Don't add a token mid-feature.
- **Whether the grocery-stale hint is a one-liner or a banner.** Resolved during U5 manual `npm run dev` smoke; if the one-liner is invisible against the page, promote to a small banner with `bg-amber-soft`. Keep tests asserting the hint's text presence regardless of styling.
- **Scoring tie-break implementation detail.** Sort comparator is straightforward but JS sort stability semantics matter; resolve at U1 unit start by writing the test first ("when scores are equal, recipes are returned alphabetically").

---

## High-Level Technical Design

> *This illustrates the intended flow and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
User clicks <MealRow> Swap button (row index N)
         │
         ▼
  actions.onSwap(N)  ──►  dispatch OPEN_SWAP_DRAWER { index: N }
         │
         ▼
  state.swapTarget = N            ◄── reducer
         │
         ▼
  <SwapDrawer open=true slot={...}>
    │
    │  on mount, computes:
    │    suggestions = swapSuggestions(N, currentMeal, recipes, plan.meals, recentLogs, weekStart)
    │
    ▼
  render up to 3 <SwapSuggestion> in a <HairlineList>
         │
         ▼
  user clicks suggestion K
         │
         ▼
  onSelect(suggestions[K].recipe)
         │
         ▼
  applySwap(N, recipe)  ──►  dispatch APPLY_SWAP_LOCAL { index: N, recipe }
         │
         ▼
  state.plan.meals[N] = { title, kidVersion, dealMatches: [] }
  state.swapTarget   = null
  state.thumbs[N]    = null  (cleared — old thumb referred to old meal)
  state.planMutatedSinceGenerate = true   (drives grocery-stale hint)
         │
         ▼
  drawer animates closed (220ms reverse)
  row N re-renders with new title
  GroceryList shows "Grocery list out of date — Regenerate to refresh"
```

---

## Implementation Units

- U1. **`src/lib/swap-ui/` synthesis + ranker module**

**Goal:** Pure-function synthesis of suggestion metadata and the suggestion ranker. Phase 2 shim shape, parallel to `src/lib/week-ui/`. Locks the seam where API enrichment will replace it.

**Requirements:** R7, R8, R9, R10, R13

**Dependencies:** None. Imports types from `src/lib/recipes/types.ts`, `src/lib/log/types.ts`, `src/lib/plan/types.ts`, and TACO_KEYWORDS / FISH_KEYWORDS re-exports from `src/lib/week-ui/`.

**Files:**
- Create: `src/lib/swap-ui/types.ts` — `RankedSuggestion`, `Protein` keyword union (or `string`)
- Create: `src/lib/swap-ui/synthesize.ts` — `extractProtein`, `extractTags`, `lastMadeDays`
- Create: `src/lib/swap-ui/rank.ts` — `swapSuggestions(...)`
- Create: `src/lib/swap-ui/index.ts` — barrel re-exports
- Create: `src/lib/swap-ui/synthesize.test.ts`
- Create: `src/lib/swap-ui/rank.test.ts`
- Modify: `src/lib/week-ui/index.ts` — export `TACO_KEYWORDS`, `FISH_KEYWORDS` so swap-ui can reuse them (currently module-local). Do not move them; re-export only.

**Approach:**
- `extractProtein(recipe: Recipe): string | null` — scan `recipe.tags` (case-insensitive trim) for exact protein keywords first; then scan `recipe.title.toLowerCase()` for keywords + species. Return the canonical label (`"fish"`, `"chicken"`, `"beef"`, `"pork"`, `"turkey"`, `"shrimp"`, `"vegetarian"`) or `null`.
- `lastMadeDays(recipe: Recipe, recentLogs: MealLog[], weekStart: Date): number | null` — sort logs descending by `log.week`; for each log, case-insensitive trimmed compare `recipe.title` against each entry in `log.cooked`. First hit returns `floor((weekStart.getTime() - logWeekDate.getTime()) / 86_400_000)`. No hit → `null`. Defensive: malformed `log.week` strings (not parseable) skip that log, do not throw.
- `swapSuggestions({ slotIndex, currentMeal, allRecipes, allMeals, recentLogs, weekStart }): RankedSuggestion[]` —
  1. Filter out recipes whose case-insensitive trimmed title matches any title in `allMeals`.
  2. For each remaining recipe, compute `score = 0`. If slot has a theme tag (synthesized via existing `synthesizeDay`'s theme detection — extract a small helper or inline), add `+10` when recipe matches. Compute `currentProtein = extractProtein(currentMealAsRecipe)` — but since `currentMeal` is a `MealPlanMeal` not a `Recipe`, do best-effort extraction from title only. If `extractProtein(candidate) !== currentProtein && both are non-null`, add `+5`.
  3. Attach `protein`, `lastMadeDays` to each scored recipe.
  4. Sort by `score` desc, tie-break by `recipe.title` ascending.
  5. Take top 3.
- `RankedSuggestion = { recipe: Recipe; protein: string | null; daysAgo: number | null; score: number }`. The `score` is exposed for testing only; UI doesn't use it.

**Execution note:** Test-first for ranker. Write the failing rank-by-score-then-title test first; the comparator is the kind of thing that ships subtly wrong without TDD.

**Patterns to follow:**
- `src/lib/week-ui/index.ts` — module shape, "Phase 2 shim" header comment, named exports.
- `src/lib/plan/types.ts` — type declaration style (interfaces, named exports).
- `src/lib/log/recent.ts` (existing recent-logs reader) — case-insensitive trimmed title comparison approach.

**Test scenarios:**
- *Happy path (synthesize):* `extractProtein({ title: "Salmon with rice", tags: ["dinner", "fish"], ... })` → `"fish"`.
- *Happy path (synthesize):* `extractProtein({ title: "Black bean tacos", tags: ["dinner", "vegetarian"], ... })` → `"vegetarian"`.
- *Edge case (synthesize):* `extractProtein({ title: "One-pan veggie skillet", tags: ["dinner", "one-pan"], ... })` — neither tag nor title hits a protein keyword → `null`.
- *Edge case (synthesize):* `extractProtein({ title: "Sheet pan chicken thighs", tags: ["dinner", "weeknight", "kid-friendly"], ... })` — title hits `chicken` even though tags don't → `"chicken"`.
- *Happy path (synthesize):* `lastMadeDays(recipe with title "Spaghetti", logs=[{week: "2026-04-20", cooked: ["Spaghetti meat sauce"]}], weekStart=2026-05-04)` → no exact title match → `null`.
- *Happy path (synthesize):* `lastMadeDays(recipe { title: "Spaghetti meat sauce" }, logs=[{week: "2026-04-20", cooked: ["Spaghetti meat sauce"]}], weekStart=2026-05-04)` → `14`.
- *Edge case (synthesize):* `lastMadeDays(recipe, logs=[{week: "2026-04-13", cooked: ["X"]}, {week: "2026-04-20", cooked: ["X"]}], weekStart=2026-05-04)` returns `14` (newer log wins, not 21).
- *Edge case (synthesize):* malformed `log.week` (`"not-a-date"`) is skipped; older valid log still counted. Function does not throw.
- *Edge case (synthesize):* case-insensitive title compare — `"BLACK BEAN TACOS"` in cooked matches `"Black bean tacos"` recipe.
- *Happy path (rank):* given 5 recipes, current meal `Sausage skillet` at slot index=1 (TUE, no theme), `swapSuggestions` returns 3 results sorted by score then title. None scored — all tied — alphabetical order asserted.
- *Happy path (rank):* slot index=1 (TUE) with one recipe tagged `taco-tuesday` and one matching keyword `quesadilla` in title — both get `+10`; tied with each other; alphabetical between them. A recipe with neither scores 0.
- *Happy path (rank):* slot index=4 (FRI), current meal protein `chicken`. A `fish` recipe tagged `fish-friday`: `+10` theme `+5` rotation = `15`. A `chicken` recipe tagged `fish-friday`: `+10` (same protein, no rotation bonus) = `10`. Fish ranked first.
- *Edge case (rank):* every non-current recipe is already in the plan → `[]` returned; component renders empty state.
- *Edge case (rank):* exactly one recipe is eligible → `[that recipe]`. Two eligible → both. Three or more → top 3.
- *Integration:* current meal title in `allMeals` is implicitly excluded — when the recipe pool has 5 recipes and 5 are in the current plan, ranker returns `[]` even if you passed a slot index. Verifies the "exclude in-week duplicates" rule covers the slot's own meal.

**Verification:**
- `npm test -- src/lib/swap-ui/` passes.
- All exports are named (no defaults). `npm run build` succeeds.

---

- U2. **Refactor `<CadencePulse>` to tagged-union state, plus `<SwapSuggestion>` component**

**Goal:** Address residual review finding R20 by switching `<CadencePulse>` from `daysAgo: number | null` to a tagged-union `state` prop with three kinds (`unknown`, `never`, `days`). Then build the new `<SwapSuggestion>` component that renders one ranked suggestion as a single tabbable button.

**Requirements:** R4, R12, R20

**Dependencies:** U1 (`RankedSuggestion` type for `<SwapSuggestion>` props).

**Execution note:** Refactor `<CadencePulse>` first (rename prop, update tests), confirm full suite green, then build `<SwapSuggestion>` against the new prop shape. Doing them in one step risks `<CadencePulse>`'s test failures masking `<SwapSuggestion>` failures.

**Files:**
- Modify: `src/components/cadence-pulse.tsx` — change props to `{ state: CadenceState }`. Remove `daysAgo` prop.
- Modify: `src/components/cadence-pulse.test.tsx` — rewrite all 6 (or 7 after week-53 add) test cases against new prop shape.
- Create: `src/components/swap-suggestion.tsx` + `swap-suggestion.test.tsx`

**Approach (CadencePulse):**
- `CadenceState = { kind: "unknown" } | { kind: "never" } | { kind: "days"; n: number }`.
- `kind: "unknown"` — render the `aria-hidden="true"` invisible placeholder (existing behavior for the old `null` case).
- `kind: "never"` — render 14 paper-edge pips + caption `"never"` (mono-sm, ink-3). New visual state.
- `kind: "days"; n` — render rightmost `clamp(n, 0, 14)` filled forest, leftmost `14 - clamp(n, 0, 14)` paper-edge, caption `"{n}d ago"`. Same as old `daysAgo: number` path.
- Internal helper `renderPips(filled: number)` consolidates the loop so the three branches share rendering.

**Approach (SwapSuggestion):**
- Props: `{ suggestion: RankedSuggestion; onSelect: (recipe: Recipe) => void }`.
- Renders a `<button type="button" data-slot="swap-suggestion" data-testid="swap-suggestion" className="w-full flex items-start justify-between gap-4 py-4 text-left hover:bg-paper-2/40">`.
- Left column: `<h4 className="text-h2 text-ink leading-tight">{suggestion.recipe.title}</h4>` (or scoped down — see Open Question). Below: `<div className="flex gap-2 mt-1">` with `<Pill variant="slate" size="sm">{suggestion.protein}</Pill>` when `protein !== null`. Skip prep pill (Phase 2).
- Right column: `<CadencePulse state={daysToCadenceState(suggestion.daysAgo)} />` where `daysToCadenceState(null) = { kind: "never" }` and `daysToCadenceState(n) = { kind: "days", n }`. The helper lives in `src/components/swap-suggestion.tsx` (private — not in `src/lib/swap-ui/` because it bridges UI shape to component shape, not data synthesis). Note: SwapSuggestion never emits `unknown` — the data is always present (recipe in hand, log searched); `unknown` is reserved for future API-pending callers.
- `onClick = () => onSelect(suggestion.recipe)`.
- `aria-label={`Swap to ${suggestion.recipe.title}`}` for accessible button text.

**Patterns to follow:**
- `src/components/meal-row.tsx` — flex column composition, `data-slot` + `data-testid` convention.
- `src/components/ui/pill.tsx` — slate variant with size="sm".
- `src/components/cadence-pulse.tsx` (current) — pip rendering loop is preserved; only the prop shape and surrounding branches change.

**Test scenarios:**
- *Happy path (CadencePulse `days`):* `<CadencePulse state={{ kind: "days", n: 3 }} />` renders 14 pips, rightmost 3 forest, caption `3d ago`. (Migrate from existing test.)
- *Happy path (CadencePulse `never`):* `<CadencePulse state={{ kind: "never" }} />` renders 14 paper-edge pips, caption `never`. (New.)
- *Happy path (CadencePulse `unknown`):* `<CadencePulse state={{ kind: "unknown" }} />` renders the invisible placeholder, no pip elements exposed to assistive tech. (Migrate from old `null` test.)
- *Edge case (CadencePulse):* `n: 0` — all pips paper-edge, caption `0d ago`.
- *Edge case (CadencePulse):* `n: 14` — all pips forest, caption `14d ago`.
- *Edge case (CadencePulse):* `n: 20` — all 14 forest (clamp), caption `20d ago`.
- *Happy path (SwapSuggestion):* renders `<h4>` with the recipe title, slate pill with the protein, CadencePulse with `n: 5` from `daysAgo: 5`.
- *Happy path (SwapSuggestion):* with `protein: null`, no slate pill is rendered (`queryByText` for `null`).
- *Happy path (SwapSuggestion):* with `daysAgo: null`, CadencePulse renders `kind: "never"` (caption `never`).
- *Happy path (SwapSuggestion):* clicking the button calls `onSelect` with the recipe object.
- *Happy path (SwapSuggestion):* `aria-label` is `"Swap to {title}"` so screen readers announce the action.
- *Edge case (SwapSuggestion):* button is keyboard-focusable (it's a real `<button>`); pressing Enter triggers `onSelect`.

**Verification:**
- `npm test -- src/components/cadence-pulse.test.tsx src/components/swap-suggestion.test.tsx` passes.
- `npm run build` succeeds (CadencePulse callsite migration is forward-only — no other consumers exist).

---

- U3. **`<SwapDrawer>` component**

**Goal:** The drawer composer — header (eyebrow + h3 + replacing caption + close), body (Sparkles eyebrow + `<HairlineList>` of `<SwapSuggestion>`s + empty state), 420px width.

**Requirements:** R2, R3, R5, R6, R12, R17

**Dependencies:** U1 (ranker), U2 (`<SwapSuggestion>`).

**Files:**
- Create: `src/components/swap-drawer.tsx` + `swap-drawer.test.tsx`

**Approach:**
- Props: `{ open: boolean; onOpenChange: (open: boolean) => void; slot: { index: number; dayKey: DayKey; dateLabel: string; currentTitle: string; suggestions: RankedSuggestion[] } | null; onSelect: (index: number, recipe: Recipe) => void; }`.
- Wraps `<Drawer open={open} onOpenChange={onOpenChange}><DrawerContent width={420}>` from `src/components/ui/drawer.tsx`.
- Header (`<DrawerHeader>`):
  - `<Eyebrow>{slot.dayKey} · {slot.dateLabel}</Eyebrow>`
  - `<DrawerTitle>Choose a swap</DrawerTitle>` (renders as h3 with `text-h3 text-ink`)
  - `<DrawerDescription>Replacing: <span className="text-ink">{slot.currentTitle}</span></DrawerDescription>`
- Body (`<DrawerBody>`):
  - `<Eyebrow><Sparkles className="size-3.5" /> Fits your rules</Eyebrow>` (lucide `Sparkles`).
  - Empty state: when `slot.suggestions.length === 0`, `<p className="text-body-sm text-ink-3 mt-3">No swaps available — your week already uses every recipe.</p>`.
  - Otherwise: `<HairlineList as="ul" className="mt-3">` containing `<li>` per suggestion, each wrapping `<SwapSuggestion suggestion={s} onSelect={(recipe) => onSelect(slot.index, recipe)} />`.
- When `slot === null`, render the `<Drawer>` with `open=false` (or short-circuit and render nothing — Drawer handles closed state via `data-[closed]` animation, so passing `open=false` lets the close animation play even after `slot` clears). Decision at unit start: short-circuit may cut off the close animation; passing `open=false` with stale slot for one render cycle preserves animation. Test asserts the closed-state DOM is gone after the animation period (use `vi.useFakeTimers` if needed).
- The drawer's close button (rendered by `<DrawerContent>` automatically with `showCloseButton`) calls `onOpenChange(false)` via the primitive's `<DialogPrimitive.Close>` — no extra wiring needed.

**Patterns to follow:**
- `src/components/ui/drawer.tsx` — composition via the named primitives.
- `src/components/email-button.tsx` — toast-on-error pattern (not used here, but the imperative-call shape is similar if needed).
- `src/components/meal-row.tsx` — `data-slot` + `data-testid` conventions.

**Test scenarios:**
- *Happy path:* with `open={true}` and a non-null slot, drawer renders with `role="dialog"`, the eyebrow shows `"TUE · Apr 28"`, the title is `"Choose a swap"`, and the description contains `"Replacing: Sausage skillet"`.
- *Happy path:* body contains the `"Fits your rules"` eyebrow with a `Sparkles` SVG.
- *Happy path:* with 3 suggestions, the body renders 3 `<SwapSuggestion>` elements separated by hairlines (`HairlineList as="ul"`).
- *Happy path:* clicking the first suggestion calls `onSelect(slot.index, suggestion[0].recipe)`.
- *Happy path:* clicking the close button calls `onOpenChange(false)`.
- *Edge case:* with `suggestions: []`, the body shows the empty-state copy `"No swaps available — your week already uses every recipe."` and no `<SwapSuggestion>` elements render.
- *Edge case:* with `open={false}`, no drawer content is in the DOM (or is in the closing state, depending on the resolved short-circuit decision).
- *Accessibility:* drawer has `role="dialog"`, `<DrawerTitle>` is the dialog's accessible name, close button has `aria-label="Close"`.
- *Accessibility:* keyboard tab order inside the drawer is close → suggestion 1 → suggestion 2 → suggestion 3 (verified by `userEvent.tab()` / `document.activeElement` assertions).

**Verification:**
- `npm test -- src/components/swap-drawer.test.tsx` passes.

---

- U4. **State machine + hook extension; `<MealRow>` actions refactor + missing tests**

**Goal:** Wire the drawer into `usePlanState` — add the `swapTarget` field, three new actions (`OPEN_SWAP_DRAWER`, `CLOSE_SWAP_DRAWER`, `APPLY_SWAP_LOCAL`), expose `applySwap` and `closeSwap` callbacks. Remove the old `SWAP_STARTED` / `SWAP_OK` / `SWAP_FAILED` actions and the `generatePlan` call inside `swap()`. Migrate `<MealRow>` to grouped `actions` prop and add the two missing test scenarios from residual review.

**Requirements:** R1, R5, R7, R14, R16, R18, R19

**Dependencies:** U1 (ranker is called from the hook to compute suggestions; or computed at component level — see Approach).

**Execution note:** Test-first for the reducer changes — the action shape is mechanical but the `planMutatedSinceGenerate` flag and the cleared-thumb invariant are easy to break. Then update `<MealRow>` to consume the `actions` group with no other behavior change, then add the two missing test scenarios.

**Files:**
- Modify: `src/lib/plan-ui/state.ts` — add `swapTarget: number | null` and `planMutatedSinceGenerate: boolean` to ready state, three new actions, remove three old swap actions.
- Modify: `src/lib/plan-ui/state.test.ts` (if exists; otherwise create) — reducer tests for the three new actions and the deletion of old ones.
- Modify: `src/lib/plan-ui/use-plan-state.ts` — replace `swap()` body to dispatch `OPEN_SWAP_DRAWER`. Add `applySwap(index, recipe)`, `closeSwap()`. Remove the `generatePlan` call from `swap()`. The `regenerate` callback continues to dispatch `REGEN_STARTED` and resets `planMutatedSinceGenerate` on `REGEN_OK`.
- Modify: `src/components/meal-row.tsx` — replace flat callback props with `actions: { onSwap, onThumbsUp, onThumbsDown }`.
- Modify: `src/components/meal-row.test.tsx` — migrate to new `actions` prop, add the two missing tests (R19).

**Approach (state machine):**
- Ready-state additions:
  - `swapTarget: number | null` — non-null when the drawer is open for that slot.
  - `planMutatedSinceGenerate: boolean` — `false` after `INIT_OK` and `REGEN_OK`; `true` after `APPLY_SWAP_LOCAL`.
- New actions:
  - `{ type: "OPEN_SWAP_DRAWER"; index: number }` — sets `swapTarget = index`. Refuses (returns state) if `state.generating`.
  - `{ type: "CLOSE_SWAP_DRAWER" }` — sets `swapTarget = null`.
  - `{ type: "APPLY_SWAP_LOCAL"; index: number; recipe: Recipe }` — replaces `state.plan.meals[index]` with `{ title: recipe.title, kidVersion: recipe.kidVersion, dealMatches: [] }`; clears `state.thumbs[index]` to `null`; sets `swapTarget = null`; sets `planMutatedSinceGenerate = true`. Validates `index >= 0 && index < REQUIRED_MEAL_COUNT`; out-of-range is a no-op (returns state, matching existing defensive style).
- Removed actions: `SWAP_STARTED`, `SWAP_OK`, `SWAP_FAILED`. The reducer's switch cases for these are deleted. `generating` is no longer toggled by swap.
- Existing reducer behavior preserved: `REGEN_OK` clears `planMutatedSinceGenerate` to `false` since the new plan reflects current meals + new grocery list. `INIT_OK` initializes both new fields.

**Approach (hook):**
- `swap(index)` — formerly called `generatePlan`. Now: `if (current.status !== "ready" || current.generating) return; dispatch({ type: "OPEN_SWAP_DRAWER", index });`. No async, no toast.
- `applySwap(index, recipe)` — `dispatch({ type: "APPLY_SWAP_LOCAL", index, recipe });`.
- `closeSwap()` — `dispatch({ type: "CLOSE_SWAP_DRAWER" });`.
- The hook does **not** compute suggestions itself; the `home-page.tsx` component does (one call to `swapSuggestions` per render when the drawer is open). Keeping ranker out of the hook means the hook's contract stays focused on state, and ranker recomputes are scoped to drawer-open renders.

**Approach (MealRow):**
- Old props: `{ row, meal, index, thumb, isSwapping, onSwap, onThumbsUp, onThumbsDown }`.
- New props: `{ row, meal, index, thumb, isSwapping, actions: { onSwap, onThumbsUp, onThumbsDown } }`.
- Component body changes: `onSwap(index)` → `actions.onSwap(index)`, etc. No JSX restructure beyond the rename.
- The two missing tests (R19): (a) clicking thumbs-down calls `actions.onThumbsDown(index)` with the row index; (b) when `isSwapping={true}`, clicking the Swap button does **not** call `actions.onSwap` (button is `disabled`). Both use `userEvent.click` + `vi.fn()` spies on the `actions` callbacks.

**Patterns to follow:**
- `src/lib/plan-ui/state.ts` (existing) — discriminated-union actions, defensive index checks, explicit `slice()` for immutability. Mirror the style.
- `src/lib/plan-ui/use-plan-state.ts` (existing) — `stateRef` for callback closures, `useCallback` deps `[]`, no toast for success.

**Test scenarios:**
- *Happy path (reducer):* `OPEN_SWAP_DRAWER { index: 2 }` from a `ready` state with `swapTarget: null` → state has `swapTarget: 2`.
- *Edge case (reducer):* `OPEN_SWAP_DRAWER` while `generating: true` → returns the same state (drawer doesn't open during regen).
- *Happy path (reducer):* `CLOSE_SWAP_DRAWER` from `swapTarget: 2` → `swapTarget: null`.
- *Happy path (reducer):* `APPLY_SWAP_LOCAL { index: 1, recipe: { title: "Salmon", kidVersion: null, ... } }` mutates `state.plan.meals[1]` to `{ title: "Salmon", kidVersion: null, dealMatches: [] }`, clears `state.thumbs[1]` to `null`, sets `swapTarget: null`, sets `planMutatedSinceGenerate: true`.
- *Edge case (reducer):* `APPLY_SWAP_LOCAL { index: 99, ... }` — out-of-range is a no-op; state unchanged.
- *Happy path (reducer):* `REGEN_OK` after `APPLY_SWAP_LOCAL` resets `planMutatedSinceGenerate` to `false`.
- *Happy path (reducer):* `INIT_OK` initializes `swapTarget: null` and `planMutatedSinceGenerate: false`.
- *Integration (hook):* calling `swap(2)` opens the drawer (`state.swapTarget === 2`). Does not call `generatePlan`. Spy on `fetch` proves no network call.
- *Integration (hook):* calling `applySwap(2, recipe)` mutates `state.plan.meals[2]` and resets `swapTarget` to `null`.
- *Happy path (MealRow, R19):* clicking thumbs-down on a row with `index=3` calls `actions.onThumbsDown` with `3`.
- *Edge case (MealRow, R19):* with `isSwapping={true}`, the Swap button is `disabled` and clicking it does not invoke `actions.onSwap`. (RTL `getByRole("button", { name: /Swap meal/ })` returns a button; `userEvent.click` is a no-op when disabled — assert `actions.onSwap` was not called.)
- *Migration sanity (MealRow):* existing tests pass once their props are updated to `actions: { ... }`.

**Verification:**
- `npm test -- src/lib/plan-ui src/components/meal-row.test.tsx` passes.
- `npm run build` succeeds — the `MealRow` props change is the only consumer-affecting change in this unit, and `home-page.tsx` is updated in U5.

---

- U5. **Wire `<SwapDrawer>` into `home-page.tsx`; grocery-stale hint; page test**

**Goal:** Mount `<SwapDrawer>` at the page level controlled by `state.swapTarget`. Pass the new `actions` prop shape to `<MealRow>`. Add the grocery-stale hint above `<GroceryList>` driven by `state.planMutatedSinceGenerate`. Update `src/app/page.test.tsx` to cover the new flow.

**Requirements:** R1, R5, R6, R12, R17

**Dependencies:** U1, U2, U3, U4. Composes everything.

**Execution note:** Update the page test first to define the new contract (drawer opens, suggestion clicked, drawer closes, row title changes). Then wire `home-page.tsx`. The hint copy is locked by a test; styling can vary.

**Files:**
- Modify: `src/components/home-page.tsx` — mount drawer, switch to `actions={{ ... }}` prop on `<MealRow>`, add grocery-stale hint.
- Modify: `src/app/page.test.tsx` — add test scenarios below.

**Approach:**
- In `HomePage`'s render branch where `state.status === "ready"`:
  - Compute `currentSlotMeal` and `suggestions` only when `state.swapTarget !== null`. Use `useMemo` keyed on `[state.swapTarget, state.recipes, state.plan.meals, state.recentLogs, weekStart]` so the ranker doesn't recompute on unrelated re-renders.
  - Build the slot prop for `<SwapDrawer>`:
    ```ts
    const slot = state.swapTarget !== null ? {
      index: state.swapTarget,
      dayKey: synthesizeDay(state.plan.meals[state.swapTarget], state.swapTarget, weekStart).dayKey,
      dateLabel: synthesizeDay(state.plan.meals[state.swapTarget], state.swapTarget, weekStart).dateLabel,
      currentTitle: state.plan.meals[state.swapTarget].title,
      suggestions,
    } : null;
    ```
  - Render `<SwapDrawer open={state.swapTarget !== null} onOpenChange={(o) => !o && closeSwap()} slot={slot} onSelect={applySwap} />` near the bottom of the section (after `<GroceryList>` is fine — Drawer portals out anyway).
- `<MealRow>` callsite: `actions={{ onSwap: swap, onThumbsUp: (i) => setThumb(i, "up"), onThumbsDown: (i) => setThumb(i, "down") }}`.
- Grocery-stale hint:
  - Above `<GroceryList items={plan.groceryList} />`, when `state.planMutatedSinceGenerate`, render `<p className="text-mono-sm text-ink-3" data-testid="grocery-stale-hint">Grocery list out of date — <button onClick={regenerate} disabled={generating} className="underline underline-offset-2">Regenerate to refresh</button>.</p>`. The button uses the same `regenerate()` callback the header `Regenerate plan` button already uses.
  - When `planMutatedSinceGenerate` is `false`, no hint.
- `LoadingState`: no change.
- `ErrorState`: no change.

**Patterns to follow:**
- The existing `useMemo(getMondayOfWeek, [])` pattern for stable per-mount values — apply for the `weekStart` (no change).
- The skip-reason input panel's data-testid + label pattern — mirror for the grocery-stale hint.

**Test scenarios:**
- *Happy path (page):* with the demo `MealPlan` fixture, clicking row 1's `Swap meal` button surfaces a dialog with title `Choose a swap`. (`findByRole("dialog", { name: /Choose a swap/ })`.)
- *Happy path (page):* the dialog header shows the row's day code + date (e.g., `TUE · Apr 28` or whatever the demo fixture week resolves to under the pinned `vi.setSystemTime`).
- *Happy path (page):* the dialog body shows up to 3 `<SwapSuggestion>` elements (`getAllByTestId("swap-suggestion")`).
- *Happy path (page):* clicking the first suggestion mutates row 1's `<h2>` to the suggestion's title, dismisses the drawer (`queryByRole("dialog")` returns `null` after the close animation), and reveals the grocery-stale hint (`getByTestId("grocery-stale-hint")`).
- *Happy path (page):* clicking the hint's `Regenerate to refresh` button triggers the same `regenerate()` path as the header button (`fetch` mock receives a `POST /api/generate-plan` call).
- *Happy path (page):* after `regenerate()` resolves with a fresh plan, the grocery-stale hint disappears.
- *Happy path (page):* clicking thumb-up on row 2 still calls `setThumb` (regression check after the `actions` refactor).
- *Edge case (page):* `Regenerate plan` button still exists in the header and triggers `regenerate()`.
- *Edge case (page):* with `emailEnabled={false}`, the `Email this` button is hidden (regression check).
- *Edge case (page):* opening the drawer when every other meal in the plan is also a recipe in the pool (so the ranker excludes them) shows the empty-state copy `"No swaps available — your week already uses every recipe."`.

**Verification:**
- `npm test` (full suite) passes.
- `npm run build` succeeds.
- `npm run lint` clean.
- Manual `npm run dev`: clicking Swap on row 1 slides the drawer in from the right; suggestions render with mono day code in eyebrow, h3 title, h4 suggestion names, slate protein pills, CadencePulse with caption; clicking a suggestion replaces the meal; grocery-stale hint appears; clicking it kicks off regenerate; hint clears once regen succeeds. `prefers-reduced-motion` check is acceptable to defer to Phase 4.

---

## System-Wide Impact

- **Interaction graph:** `swap()` no longer calls `/api/generate-plan`. The page now mounts an additional component (`<SwapDrawer>`) that consumes the same `state.recipes`, `state.recentLogs`, `state.plan.meals` already in memory. No new entry points beyond the new actions on the existing reducer.
- **Error propagation:** The `generatePlan()` call removed from `swap()` was the only swap-time error path; it disappears with the call. `applySwap` is purely synchronous and cannot fail. `regenerate()`'s error path is unchanged. Toast surfaces are unchanged.
- **State lifecycle risks:**
  - Cleared thumb on swap is preserved (already present in old `SWAP_OK`; kept in `APPLY_SWAP_LOCAL`).
  - `planMutatedSinceGenerate` is a new lifecycle bit — must be cleared on `REGEN_OK` and `INIT_OK`. Tests cover both.
  - Drawer-while-regenerating: `OPEN_SWAP_DRAWER` is a no-op when `generating` is true. Confirm test coverage. Conversely, `regenerate()` should not no-op when `swapTarget !== null` — clicking Regenerate while the drawer is open still fires regen, but the drawer's open state is unaffected. Resolved: `REGEN_STARTED`'s reducer branch leaves `swapTarget` alone; only `APPLY_SWAP_LOCAL` and `CLOSE_SWAP_DRAWER` clear it. Test asserts both directions.
- **API surface parity:** No backend changes. `MealPlan` shape unchanged. Removing the `swap()`-side `generatePlan` call reduces /api/generate-plan traffic — a behavior change worth calling out in the PR description (cost reduction, no UX regression except grocery-list-now-stale).
- **Integration coverage:** Page test (`src/app/page.test.tsx`) exercises the cross-layer flow (button click → reducer dispatch → drawer mount → suggestion click → reducer dispatch → row re-render + hint reveal). No new e2e tests; `cypress/e2e/` is still empty (deferred per `feat-editorial-week-screen-plan.md`).
- **Unchanged invariants:**
  - `REQUIRED_MEAL_COUNT === 5` — preserved; `APPLY_SWAP_LOCAL` validates index range.
  - `MealPlan.meals.length` always 5 — preserved (in-place replacement).
  - `MealPlanMeal.kidVersion` is `string | null` — preserved (we copy from `recipe.kidVersion` which has the same type).
  - `MealPlanMeal.dealMatches` is `DealMatchOnMeal[]` — set to `[]` after a local swap; type still satisfied. Documented as intentional.
  - All API routes untouched. Editorial primitives from #89 untouched. Tokens from #87 untouched.
  - Page server component `src/app/page.tsx` — unchanged. `emailEnabled` plumbing preserved.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Local swap leaves grocery list stale; users may not notice and shop wrong groceries. | Visible `grocery-stale-hint` above the list, locked by test for copy and test-id. Manual smoke verifies visibility. Phase 3 follow-up adds server-side per-slot recompute. |
| Suggestion ranking is keyword-based and may produce surprising orderings (e.g., a fish recipe outranking a closer match because the keyword list is incomplete). | Keep the keyword lists single-sourced via re-export from `src/lib/week-ui/`. Tests assert specific orderings on representative fixtures. The seam is named (`src/lib/swap-ui/`) so future API enrichment replaces the whole module cleanly. |
| `<CadencePulse>` API change (`daysAgo` → `state`) breaks any callsite that's added between this plan being written and this PR landing. | Pre-flight: U2 first step is `grep -r "CadencePulse" src/` to confirm zero non-test consumers. Rebase + rerun the grep before merge if other PRs are landing. |
| Drawer animation timing in tests (220ms slide-out before DOM removal) may flake. | Use `findByRole` / `findByTestId` (RTL's promise-based matchers) for the dialog's appearance and `waitForElementToBeRemoved` for its disappearance. Avoid `getBy*` which is synchronous and races with the animation. |
| `useMemo` recomputation key for `suggestions` may miss a dependency and serve stale rankings. | Test asserts that after `APPLY_SWAP_LOCAL` mutates `state.plan.meals`, opening the drawer on the same slot the next time produces a re-ranked list (the swapped-in meal is now correctly excluded from the next round of suggestions). |
| Empty-state copy ("No swaps available — your week already uses every recipe.") is surfaced rarely in real life (recipe pool will exceed 5) but always rendered when demo fixtures are reduced. | Tests cover the empty-state branch with a shrunk recipe pool fixture; manual smoke against full demo data verifies normal flow. |
| Removing `SWAP_STARTED` / `SWAP_OK` / `SWAP_FAILED` from the reducer breaks any external consumer dispatching these. | Grep confirms only `use-plan-state.ts` dispatches these (and its dispatch site is rewritten in U4). No exports from `state.ts` outside the hook reach external code. |
| Sparkles icon (lucide) may render at a non-Editorial stroke weight relative to other icons in the system. | Stroke width is a Tailwind `stroke-[1.5]` arbitrary value already used elsewhere; spot-check during U5 manual smoke. Acceptable to fall back to no icon ("Fits your rules" eyebrow as plain text) if visually off. |

---

## Documentation / Operational Notes

- No env vars, no rollout, no monitoring changes.
- **CLAUDE.md update.** The `## Source Layout` section's `src/lib/` paragraph already enumerates `recipes/`, `deals/`, `plan/`, `log/`, `pantry/`, `plan-ui/`, `week-ui/`, `email/`. Add `swap-ui/` to that list with a one-clause description: `swap-ui/ (Phase-2 client-side ranker + suggestion synthesis — replace when /api/generate-plan ships per-slot swap suggestions)`. The existing `src/components/` paragraph adds `swap-drawer.tsx` and `swap-suggestion.tsx`. Sub-step in U5.
- **`docs/residual-review-findings/feat-editorial-week-screen.md`** — three findings (R18 callback grouping, R19 missing tests, R20 CadencePulse tagged-union) are addressed by this PR. After merge, either delete the file (the findings are absorbed) or annotate which items remain (the unconsumed `metadata` field, KidNote `who` plumbing, LoadingState HairlineList desync). U5 sub-step: edit the file to remove only the addressed bullets so future readers see the remaining advisory items clearly.
- Open follow-up issues: (a) server-side grocery-list refresh after local swap, (b) family-member rule weighting in suggestion ranker (Phase 3 Settings dependency), (c) `prep` pill on suggestions once API enrichment lands.
- After merge, run `/ce-compound` to capture: (i) the local-swap state pattern (mutation flag + visible staleness signal), (ii) the tagged-union encoding for "deployment-state vs domain-state" decisions in component props, (iii) the keyword-based ranker shim and where its seam lives.

---

## Sources & References

- **Design source:** `design/spec.md` §3.1 (SwapDrawer header/body/ranking), §3.3 (CadencePulse), §3.5 (Standard buttons). `design/design-system.md` §6 (component primitives).
- **Tracking issue:** [#86 — UI makeover: adopt Editorial design system](https://github.com/dancj/meal-assistant/issues/86) (Phase 2 item 7).
- **Predecessor PRs:** #87 (tokens), #89 (primitives — Drawer, Pill, HairlineList, Eyebrow, Button), #90 (Editorial Week-screen — MealRow, CadencePulse, KidNote, week-ui synthesis module).
- **Residual review findings:** `docs/residual-review-findings/feat-editorial-week-screen.md` — R18, R19, R20 reference back to specific bullets.
- **Related code:**
  - `src/components/{meal-row,cadence-pulse,kid-note,day-label}.tsx`
  - `src/components/ui/{drawer,pill,eyebrow,hairline-list,button}.tsx`
  - `src/lib/{week-ui,plan-ui,recipes,plan,log}/`
- **External docs:** None — design system is the authority.
