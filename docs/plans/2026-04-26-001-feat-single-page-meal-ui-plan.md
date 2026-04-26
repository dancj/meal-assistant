---
title: "feat: Single-page meal UI (deals + 5 meal cards + grocery list)"
type: feat
status: active
date: 2026-04-26
---

# feat: Single-page meal UI (deals + 5 meal cards + grocery list)

## Overview

Issue #67 turns the empty Next.js shell into the working face of the app: one on-demand page that, on mount, fetches deals + recipes + (empty) logs in parallel, then calls `POST /api/generate-plan` to render a left-rail deals sidebar, five meal cards, and a store-grouped grocery list. Plan state lives entirely in client React state — no DB, no localStorage, no cron. The page is the integration point that makes #64, #65, and #66 visible end-to-end.

---

## Problem Frame

The repo currently exposes three working APIs (`GET /api/recipes`, `GET /api/deals`, `POST /api/generate-plan`) but the only rendered UI at `src/app/page.tsx` is a placeholder that says "refactor in progress." Until a UI consumes those APIs, none of the prior work is reachable from a browser. #67 is that consumer.

The page must:
- Boot the full pipeline on load with no user action required
- Show meaningful loading / partial / error states (deals can fail per-store with a 200; recipes can fail outright; generate-plan can time out)
- Let the user regenerate the whole plan, swap a single meal, and (later) thumbs-up/down individual meals
- Make kid-version callouts and deal-match badges first-class on each meal card
- Render the grocery list grouped by store (Aldi / Safeway / Costco / Wegmans)

---

## Requirements Trace

- R1. On mount, fetch `/api/recipes`, `/api/deals`, and an empty `logs` list in parallel, then `POST /api/generate-plan` with `{ recipes, deals, logs: [], pantry: [] }` and render the result.
- R2. Render a left-rail deals sidebar grouped by store; collapsible/hidden on mobile, visible on `md+`.
- R3. Render exactly five meal cards from `MealPlan.meals`, each showing title, optional kid-version callout, and any deal-match badges.
- R4. Render a grocery list grouped by store with sections for `aldi`, `safeway`, `costco`, `wegmans` (only show sections that have items).
- R5. Provide a "Regenerate plan" action that re-calls `/api/generate-plan` with the originally fetched recipes + deals and replaces the entire plan.
- R6. Provide a per-meal "Swap this meal" action that re-calls `/api/generate-plan` and replaces only that meal slot in the existing plan; the grocery list is replaced wholesale by the swap response (decision below).
- R7. Provide thumbs-up / thumbs-down controls on each meal card that are visible and clickable but no-op in this issue (logging is owned by #68).
- R8. Plan state — recipes, deals, current `MealPlan`, last-fetched-at — survives regenerate and swap interactions in client React state only. No persistence layer.
- R9. Loading, partial-failure, and full-failure UI states are explicit: skeletons during initial load, inline error with retry on plan failure, deals-sidebar showing only the stores that returned (using `X-Deals-Errors`/`X-Deals-Stores` is optional — the deals payload is sufficient).
- R10. No "Email me this" surface in this issue. Email lands with #70 alongside `/api/email`.

---

## Scope Boundaries

- No persistence (no localStorage, no DB, no URL state) — full page reload starts fresh.
- No thumbs-up/down logging behavior — the controls render but do nothing on click. The wire-up belongs to #68.
- No pantry awareness — `pantry: []` is sent to `/api/generate-plan` until #69.
- No log-aware generation — `logs: []` until #68.
- No "Email me this" UI or endpoint — both belong to #70.
- No new server endpoints. Only `page.tsx` and supporting client code change. The three existing API routes are consumed as-is.
- No design-system additions beyond shadcn primitives already in `src/components/ui/`. No new dependencies.

---

## Context & Research

### Relevant Code and Patterns

- `src/app/page.tsx` — current placeholder, replaced by a client component composition.
- `src/app/layout.tsx` — already provides the app chrome (`max-w-3xl mx-auto`). The deals sidebar will need a wider container; either widen `<main>` or override per-page. Decision below.
- `src/lib/plan/types.ts` — `MealPlan`, `MealPlanMeal`, `GroceryItem`, `Store` (the four-store union: `aldi | safeway | costco | wegmans`), `STORES` constant, `REQUIRED_MEAL_COUNT`.
- `src/lib/recipes/types.ts` — `Recipe`.
- `src/lib/deals/types.ts` — `Deal` (note: deals' `Store` union is `safeway | aldi` only — narrower than plan's `Store`).
- `src/components/ui/` — `card`, `button`, `badge`, `separator`, `skeleton`, `sonner` (toaster already mounted in layout), `tooltip`. Sufficient primitives; no new shadcn components needed.
- `src/lib/email.test.ts` — existing co-located test pattern (`*.test.ts` next to source).

### Institutional Learnings

- `docs/solutions/build-errors/` — lints/build errors cluster. No directly-applicable design or React-specific learnings live here yet; nothing to inherit beyond the existing test conventions.

### External References

None needed. The work is composition of existing primitives and existing API contracts.

---

## Key Technical Decisions

- **Page becomes a client component.** `src/app/page.tsx` switches to `"use client"`. The server boundary is unnecessary — every interaction (regenerate, swap, future thumbs) needs client state, and there is no meaningful SEO content to pre-render.
- **Layout container widens for this page only.** The `<main>` in `layout.tsx` is `max-w-3xl`; the deals sidebar + meal grid needs more room. Solution: keep `layout.tsx` unchanged and have `page.tsx` render its own full-width wrapper that breaks out of the parent constraint with `-mx-4 max-w-none` or by rendering at the root and re-applying its own padding. Concrete approach is the implementer's call; the constraint is "do not regress other pages."
- **Swap behavior: regenerate full plan, replace one meal slot, replace grocery list wholesale.** Confirmed with the user. Rationale: the model returns a coherent grocery list that aligns with its 5-meal output; merging would either create stale items or require client-side reconciliation that we intentionally avoid. The "lost fidelity" cost (other 4 meals' groceries momentarily reflect a different mix) is acceptable for this MVP and reverses on the next regenerate.
- **State shape is a discriminated union.** `{ status: "loading" } | { status: "error", error } | { status: "ready", recipes, deals, plan }` rather than juggling four nullable fields. Keeps render logic exhaustive and prevents impossible states (e.g., plan present but recipes missing during swap).
- **Pure state reducer, thin hook.** A `planReducer` lives in `src/lib/plan-ui/` as plain TypeScript and is unit-tested with Vitest. `usePlanState` is a thin `useReducer` + `useEffect` wrapper that orchestrates fetches and dispatches actions. This keeps the testable surface free of React internals.
- **API client helpers are typed thin wrappers.** `fetchRecipes()`, `fetchDeals()`, `generatePlan(input)` in `src/lib/api/client.ts`. Each returns the typed payload or throws a tagged error. No retry, no caching — the page reloads or re-clicks "Regenerate" to retry.
- **Vitest environment per-file.** Component tests need jsdom; the global `vitest.config.ts` is `environment: "node"`. Component test files add `// @vitest-environment jsdom` at the top rather than flipping the global default (avoids slowing the existing pure-logic suites).
- **Deals sidebar shows raw deals as-is.** No de-duping, no sorting beyond what the API returns. The planner already ranks; the sidebar is pure display. Keeps this issue small.
- **No suspense or RSC streaming.** `useEffect` + `useReducer` is enough for one page that always boots from the same three calls.

---

## Open Questions

### Resolved During Planning

- Swap meal mechanism: regenerate full plan, replace 1 meal, replace grocery list wholesale (user-confirmed).
- Email button: omit entirely; deferred to #70 (user-confirmed).
- `logs` and `pantry`: empty arrays — `validateInput` in `src/lib/plan/generate.ts` accepts `[]` for both.
- Test infra: RTL + jsdom are already in `package.json`; component tests opt in via `// @vitest-environment jsdom`.

### Deferred to Implementation

- Exact responsive breakpoint for sidebar collapse — likely `md` (768px) but the implementer should pick what looks right alongside the existing typography.
- Whether the deals sidebar should expose store-failure ("Safeway unavailable") inline. The deals payload alone may be enough, since failed stores simply return zero deals; if the implementer notices this is confusing, pull `X-Deals-Errors` from the response headers and surface it. Otherwise omit.
- Whether to debounce rapid swap clicks on the same card. Defer until the implementation feels racy in practice.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

State machine (single `useReducer` in `usePlanState`):

```
       (mount)
          │
          ▼
   ┌─────────────┐    INIT_FAILED    ┌──────────┐
   │  loading    │──────────────────▶│  error   │
   └─────────────┘                    └──────────┘
          │ INIT_OK                        │ RETRY
          ▼                                ▼
   ┌─────────────┐                  (back to loading)
   │   ready     │◀─────────────────┐
   │  (plan,     │  PLAN_OK         │
   │   recipes,  │                  │
   │   deals)    │   GEN_STARTED    │
   └─────────────┘─────────────────▶│  generating
          │                          │  (overlay)
          │ SWAP_OK / REGEN_OK ◀─────┘
          ▼ SWAP_FAILED / REGEN_FAILED
       (toast error, stay in ready with old plan)
```

Page composition:

```
<PageRoot>                       (full-width client component)
  ├── <DealsSidebar deals=... /> (md:fixed left rail; mobile: collapsible disclosure)
  └── <PlanColumn>
        ├── <PlanToolbar onRegenerate /> (regenerate button + status indicator)
        ├── <MealGrid>
        │     └── <MealCard ×5
        │           title, kidVersion, dealMatches,
        │           onSwap, onThumbsUp (noop), onThumbsDown (noop) />
        └── <GroceryList groupedByStore />
```

Data flow on mount (R1, R9):

```
mount → Promise.all([fetchRecipes, fetchDeals]) → if both ok →
  generatePlan({recipes, deals, logs:[], pantry:[]}) → dispatch PLAN_OK
  on any failure → dispatch INIT_FAILED with which step + message
```

Swap flow (R6):

```
swap(index) → dispatch GEN_STARTED → generatePlan(same input) → dispatch SWAP_OK {index, newPlan}
  reducer: meals[index] = newPlan.meals[0]; groceryList = newPlan.groceryList
```

---

## Implementation Units

- U1. **Typed API client helpers**

**Goal:** Provide three fetch wrappers the page uses to talk to existing API routes.

**Requirements:** R1, R5, R6.

**Dependencies:** None.

**Files:**
- Create: `src/lib/api/client.ts`
- Create: `src/lib/api/client.test.ts`

**Approach:**
- Export `fetchRecipes(): Promise<Recipe[]>`, `fetchDeals(): Promise<Deal[]>`, `generatePlan(input: GeneratePlanInput): Promise<MealPlan>`.
- Each helper calls `fetch` against the same-origin route, throws a tagged `ApiError` (with `status` and `endpoint`) on non-2xx, and returns the parsed JSON typed via the existing types in `src/lib/recipes/types.ts`, `src/lib/deals/types.ts`, `src/lib/plan/types.ts`.
- No retry, no caching, no abort signal plumbing. The page handles errors at the reducer level.
- Re-export the existing types from this module is not required — consumers import them directly from their source.

**Patterns to follow:**
- Tagged error pattern from `src/lib/plan/errors.ts`.
- Test layout style from `src/lib/plan/generate.test.ts` (mock `globalThis.fetch` per-test).

**Test scenarios:**
- Happy path: each helper returns parsed JSON of the right shape on a 200 response (use a minimal fixture cast to the expected type — runtime shape is trusted from upstream routes).
- Error path: non-2xx response throws `ApiError` with `status` and `endpoint` set; the response body is included in the error message when JSON-decodable.
- Error path: network failure (mock `fetch` to reject) throws an error whose message names the endpoint.
- Edge case: 200 with malformed JSON throws an error that mentions the endpoint.

**Verification:**
- `npm run test -- src/lib/api/client.test.ts` passes.
- `tsc --noEmit` shows no type errors when these helpers are imported with the existing typed payloads.

---

- U2. **Plan state reducer + `usePlanState` hook**

**Goal:** Encapsulate the page's state machine — initial fetch, plan ready, regenerate, swap, error — as a pure reducer plus a thin React hook.

**Requirements:** R1, R5, R6, R8, R9.

**Dependencies:** U1.

**Files:**
- Create: `src/lib/plan-ui/state.ts` (reducer + action types + initial state)
- Create: `src/lib/plan-ui/state.test.ts`
- Create: `src/lib/plan-ui/use-plan-state.ts` (React hook wrapping the reducer)
- Create: `src/lib/plan-ui/use-plan-state.test.tsx` (jsdom)

**Approach:**
- `State` is a discriminated union: `{ status: "loading" } | { status: "error", error: string } | { status: "ready", recipes, deals, plan, generating: boolean }`.
- Actions: `INIT_OK`, `INIT_FAILED`, `REGEN_STARTED`, `REGEN_OK`, `REGEN_FAILED`, `SWAP_STARTED`, `SWAP_OK { index, plan }`, `SWAP_FAILED`.
- `SWAP_OK` replaces `state.plan.meals[action.index]` with `action.plan.meals[0]` and replaces `state.plan.groceryList` with `action.plan.groceryList`.
- `usePlanState()` returns `{ state, regenerate(), swap(index) }`. On mount it kicks off the parallel fetch + generate sequence; failures dispatch `INIT_FAILED`.
- Generation failures during regenerate/swap keep the existing plan and emit a toast via `sonner` (the `Toaster` is already mounted in `layout.tsx`).

**Patterns to follow:**
- Discriminated unions used in `src/lib/plan/types.ts`.
- Test style from `src/lib/plan/validate.test.ts` (focused, behavior-named cases).

**Test scenarios:** *(reducer — pure)*
- Happy path: `INIT_OK` from `loading` transitions to `ready` with the supplied recipes/deals/plan and `generating: false`.
- Happy path: `SWAP_OK { index: 2, plan: P }` replaces only `meals[2]` with `P.meals[0]` and replaces `groceryList` wholesale.
- Happy path: `REGEN_OK` replaces the full plan and clears `generating`.
- Edge case: `SWAP_OK` with `index` out of range (>= 5 or < 0) leaves state unchanged.
- Edge case: actions received in `error` state are ignored except `INIT_OK` (which transitions to `ready`).
- Error path: `INIT_FAILED` from `loading` transitions to `error` with the supplied message.
- Error path: `SWAP_FAILED` / `REGEN_FAILED` from `ready` keeps the existing plan and clears `generating`.

**Test scenarios:** *(hook — jsdom, RTL `renderHook`)*
- Integration: on mount, fetch helpers are called once each, then `generatePlan` is called with `{ recipes, deals, logs: [], pantry: [] }`; final `state.status === "ready"`.
- Integration: when `fetchRecipes` rejects, final `state.status === "error"` and `generatePlan` is never called.
- Integration: `swap(2)` calls `generatePlan` again with the same recipes/deals and updates only `meals[2]` and `groceryList`.

**Verification:**
- Reducer tests cover every action × every starting status (cells that don't apply are explicitly documented as no-ops in the test names).
- Hook tests pass under `// @vitest-environment jsdom`.

---

- U3. **`DealsSidebar` component**

**Goal:** Render this week's deals grouped by store as a left-rail sidebar (visible `md+`, collapsible on small screens).

**Requirements:** R2, R9.

**Dependencies:** None for code; consumes `Deal[]` from U1 via the page.

**Files:**
- Create: `src/components/deals-sidebar.tsx`
- Create: `src/components/deals-sidebar.test.tsx` (jsdom)

**Approach:**
- Props: `{ deals: Deal[] }`. Group by `deal.store`, render a section per store with an `<h2>` and a list of `productName · brand · salePrice (was regularPrice) · validTo`.
- Use `Card` from `src/components/ui/card.tsx` for visual grouping; use `Badge` for promo type when not `"sale"`.
- Mobile: render as a `<details>`/`<summary>` disclosure or a shadcn equivalent. Keep it native HTML if there's no clean fit — no new dependency.
- Empty state: if a store has zero deals, omit its section entirely. If both stores are empty, show a single muted line ("No deals available right now.").

**Patterns to follow:**
- shadcn `Card` usage from existing `src/components/ui/card.tsx`.
- `cn()` from `src/lib/utils.ts` for conditional classnames.

**Test scenarios:**
- Happy path: given a mixed `Deal[]` with 2 Safeway + 3 Aldi entries, both store sections render with the right counts and the items appear under their respective store.
- Happy path: each rendered deal shows productName, salePrice, and validTo.
- Edge case: `deals=[]` renders the muted empty-state line and no store sections.
- Edge case: deals from only one store renders that store's section and omits the other.
- Edge case: a deal with `promoType: "sale"` does not render a promo badge; `"bogo"` does.

**Verification:**
- `npm run test -- src/components/deals-sidebar.test.tsx` passes.
- Visual check in `npm run dev` — sidebar appears at `md+` and stacks above the main column at `sm`.

---

- U4. **`MealCard` component**

**Goal:** Render a single meal with title, kid-version callout, deal-match badges, and the swap + thumbs controls.

**Requirements:** R3, R6, R7.

**Dependencies:** None for code; the page wires `onSwap`.

**Files:**
- Create: `src/components/meal-card.tsx`
- Create: `src/components/meal-card.test.tsx` (jsdom)

**Approach:**
- Props: `{ meal: MealPlanMeal; index: number; isSwapping: boolean; onSwap(index): void; onThumbsUp(index): void; onThumbsDown(index): void }`.
- Layout: `Card` with title (h3), kid callout below title (only when `meal.kidVersion !== null`), deal badges row (only when `meal.dealMatches.length > 0`), action row at the bottom with thumbs up / thumbs down / swap.
- Kid callout is visually distinct: `bg-accent/40` panel with a left border in `--accent-foreground`. Prefix with the 🧒 emoji as the issue specifies. Treat the emoji as content per the issue, not a violation of the no-emoji-without-asking rule (the issue explicitly asks for it).
- Deal badge format: `🏷 {item} {salePrice} @ {store}`.
- `onSwap` is wired; thumbs handlers receive a real prop but the page passes no-op functions in this issue. The component does not know they're no-ops.
- Disable the swap button while `isSwapping` is true; show a small spinner or "Swapping…" label.

**Patterns to follow:**
- shadcn `Card`, `Button`, `Badge`.
- `lucide-react` icons for thumbs (`ThumbsUp`, `ThumbsDown`, `RefreshCw`).

**Test scenarios:**
- Happy path: renders title, kid version, and a deal badge for each `dealMatches` entry.
- Edge case: `kidVersion: null` does not render the callout block (no empty container in the DOM).
- Edge case: empty `dealMatches` does not render a badge row.
- Integration: clicking the swap button calls `onSwap(index)` once with the right index.
- Integration: clicking thumbs up/down calls the corresponding handler with the right index.
- Edge case: when `isSwapping=true`, the swap button is disabled and additional clicks do not invoke `onSwap`.

**Verification:**
- Test file passes under jsdom.
- Visual check shows the kid callout reads clearly distinct from the meal title.

---

- U5. **`GroceryList` component**

**Goal:** Render the grocery list grouped by store with a section per store that has at least one item.

**Requirements:** R4.

**Dependencies:** None.

**Files:**
- Create: `src/components/grocery-list.tsx`
- Create: `src/components/grocery-list.test.tsx` (jsdom)

**Approach:**
- Props: `{ items: GroceryItem[] }`.
- Group by `item.store` using the canonical order from `src/lib/plan/types.ts` `STORES` constant: `aldi, safeway, costco, wegmans`. Skip stores with zero items.
- Each section: store display name as `<h3>`, then a `<ul>` of items rendered as `quantity · item` (e.g., `2 lb · chicken thighs`). Items with a `dealMatch` show a small `🏷 {salePrice}` badge inline.
- Consider a final "Total items" muted line under the list. Optional — implementer's call.

**Patterns to follow:**
- shadcn `Badge` for deal indicators.
- `STORES` constant from `src/lib/plan/types.ts`.

**Test scenarios:**
- Happy path: items from three different stores render in three sections, ordered per `STORES`.
- Happy path: items with `dealMatch` render the badge; items with `dealMatch: null` do not.
- Edge case: an empty store is omitted entirely (no header, no `<ul>`).
- Edge case: `items=[]` renders a muted "No grocery items" line and no sections.
- Edge case: items are rendered in array order within each store section (stability matters for future swap UX).

**Verification:**
- Test file passes.
- Visual check confirms the four-store ordering even when the model returns items in a different order.

---

- U6. **Page composition + layout container**

**Goal:** Wire `usePlanState` and the three components into `src/app/page.tsx`, including loading skeletons, error retry, and the regenerate toolbar. Ensure the wider layout works without regressing other future pages.

**Requirements:** R1, R2, R3, R4, R5, R8, R9, R10.

**Dependencies:** U1, U2, U3, U4, U5.

**Files:**
- Modify: `src/app/page.tsx` (replace the placeholder)
- Possibly modify: `src/app/layout.tsx` (only if necessary to allow this page to break out of `max-w-3xl`; prefer per-page width override)
- Create: `src/app/page.test.tsx` (jsdom — high-level smoke test)

**Approach:**
- Top of file: `"use client"`.
- Render order: `<PageRoot>` (wider container) → grid with sidebar (`md:col-span-3`) and main column (`md:col-span-9`).
- States:
  - `loading`: render `Skeleton` placeholders for sidebar, 5 meal cards, and grocery list.
  - `error`: render an inline error card with the error message and a "Try again" button that re-mounts (or dispatches an internal `RETRY`).
  - `ready`: render `<DealsSidebar>`, a top toolbar with "Regenerate" (disabled while `state.generating`), `<MealCard>` ×5, and `<GroceryList>`.
- Toolbar shows a small generating indicator when `state.generating` is true (regenerate or swap in flight).
- `onSwap(index)` calls the hook's `swap(index)`; `onRegenerate` calls `regenerate()`.
- No "Email me this" UI element of any kind — this is intentional per scope decision.
- `onThumbsUp`/`onThumbsDown` props are wired with no-op callbacks; add a `// TODO(#68): wire to /api/log` comment exactly once where they are passed in.

**Patterns to follow:**
- Existing layout chrome in `src/app/layout.tsx`.
- shadcn `Skeleton` for loading states.
- `sonner` toast for swap/regenerate failures (already mounted via `<Toaster />` in layout).

**Test scenarios:**
- Happy path (smoke): mock the three API helpers, render the page, wait for `findByRole("heading", { name: /meal/i })` to appear; verify five meal cards and at least one deal section render.
- Edge case: when initial `fetchRecipes` rejects, the error UI renders with a "Try again" button and no meal cards.
- Edge case: clicking "Regenerate" calls `generatePlan` again with the originally fetched `recipes` and `deals` (verified via the mock).
- Edge case: clicking "Swap" on meal index 3 results in `meals[3].title` changing and other indices remaining unchanged.
- Edge case: `Email me this` is not present in the DOM.

**Verification:**
- `npm run dev` shows the page rendering live data when env vars are set.
- `npm run lint` clean.
- `npm run build` clean (no client/server boundary errors).

---

## System-Wide Impact

- **Interaction graph:** This is the first client-state-heavy page. The `Toaster` already mounted in `layout.tsx` is the sole side-effect channel for non-blocking errors.
- **Error propagation:** API errors surface either as a full-page error state (initial fetch / generate) or as a toast (regenerate / swap). The reducer is the single arbiter — components never call helpers directly.
- **State lifecycle risks:** Swap and regenerate can race. Mitigation: the hook ignores `SWAP_OK` / `REGEN_OK` if the dispatched action's nonce doesn't match the latest issued nonce. Implementer may stub this and revisit only if a real race appears in dev — defer if not yet needed.
- **API surface parity:** None — this issue does not touch `/api/*`. The contract decisions in `src/lib/plan/types.ts` (`Store` union, `MealPlanMeal` shape, `GroceryItem` shape) are consumed verbatim.
- **Integration coverage:** A page-level smoke test exercises the mount → fetch → generate path with mocked helpers. This is the first cross-layer test in the repo.
- **Unchanged invariants:** `layout.tsx`'s header and toaster remain untouched in behavior. Other future pages (e.g., a future recipes-management page) still get the `max-w-3xl` chrome unless they opt out the same way `page.tsx` does.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `vitest.config.ts` has `environment: "node"`, so component tests fail by default. | Each component/hook test file opts in via `// @vitest-environment jsdom` at the top. Add to plan documentation; verify in U2 first since it is the first jsdom test. |
| Layout container width — widening `<main>` regresses other pages, but per-page overrides feel hacky. | Prefer per-page wrapper that uses negative margin / `max-w-none`; do not edit `layout.tsx` unless the per-page override proves brittle. Document the choice in code with a single short comment. |
| API timeouts (`/api/generate-plan` is 60s) make the loading state long. | Skeletons + an honest "Generating your plan…" copy line. No change to the API timeout — already set in `src/app/api/generate-plan/route.ts`. |
| `Store` union mismatch: `Deal.store` is `safeway|aldi`, `GroceryItem.store` is `aldi|safeway|costco|wegmans`. | Code that handles both must not assume they're interchangeable. The deals sidebar consumes `Deal.store` only; the grocery list consumes `GroceryItem.store` only. Don't share helpers across the boundary. |
| Swap UX feels racy on rapid clicks. | Disable the swap button while `state.generating`. If still problematic in practice, add the nonce guard described in System-Wide Impact. Defer until observed. |

---

## Documentation / Operational Notes

- Update `CLAUDE.md` "Active Work" entry for #67 from a description-only line to "**Implemented**" with a one-sentence summary of what's now reachable in the browser.
- Update `CLAUDE.md` "Source Layout" to mention `src/lib/api/`, `src/lib/plan-ui/`, and the new `src/components/*` files.
- No env var changes — the page consumes existing routes only.
- No deployment changes — Vercel free tier already handles client-rendered Next pages.

---

## Sources & References

- Issue: [#67 — Single-page UI: deals sidebar, 5 meal cards, store-grouped grocery list](https://github.com/dancj/meal-assistant/issues/67)
- Upstream APIs:
  - `src/app/api/recipes/route.ts`
  - `src/app/api/deals/route.ts`
  - `src/app/api/generate-plan/route.ts`
- Upstream types:
  - `src/lib/plan/types.ts`
  - `src/lib/recipes/types.ts`
  - `src/lib/deals/types.ts`
- Existing UI primitives: `src/components/ui/`
- Existing chrome: `src/app/layout.tsx`
