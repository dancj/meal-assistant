---
title: "feat: Pantry awareness — read /pantry.md, omit staples, surface freezer stock"
type: feat
status: active
date: 2026-04-26
---

# feat: Pantry awareness — read /pantry.md, omit staples, surface freezer stock

## Overview

Issue #69 closes the third quality knob on plan generation: the model already knows about recipes (#64), this week's deals (#65), and recent logs (#68). With this PR it also knows what's already in the pantry and the freezer, so the grocery list stops including salt-and-pepper-class items and the picker can prefer recipes that consume freezer protein the household already paid for.

`/pantry.md` lives in the recipes repo and is read by a new `GET /api/pantry` route. The page fetches it on mount alongside recipes, deals, and logs, then passes the parsed `{ staples, freezer }` object into `POST /api/generate-plan`. The current `pantry: string[]` placeholder in `GeneratePlanInput` is replaced with the richer two-list shape (user-confirmed). The prompt is updated to distinguish the two roles: staples are an unconditional grocery-list exclusion; freezer entries are already-available stock to consider when picking proteins.

---

## Problem Frame

Without pantry awareness, the LLM happily lists salt, pepper, olive oil, garlic, and onions on every grocery list — items that are always on hand but the model has no way to know that. Worse, when the user has already bought 5 lb of chicken thighs at Costco and put them in the freezer, the model picks chicken-heavy weeks and lists chicken thighs again on the grocery list.

The fix is a manually-maintained `/pantry.md` file in the recipes repo (the same source of truth as recipes and logs). The user updates it occasionally — when they shop bulk at Costco for the freezer, when they run out of staples — and Claude reads it at plan-generation time.

The issue distinguishes two semantically different lists:

- **`staples`** — always-on-hand items the model must never put on the grocery list. Hard exclusion.
- **`freezer`** — manually maintained stock the model can suggest using. Soft guidance: prefer recipes that use freezer items, and avoid redundant protein purchases on the grocery list.

The freezer entries in the example are freetext strings with date suffixes ("ground beef (Costco, bought 2026-04-10)"). The parser preserves them verbatim — the freetext metadata is part of the LLM's signal, not a structural field.

---

## Requirements Trace

- R1. `GET /api/pantry` reads `/pantry.md` from the recipes repo and returns `{ staples: string[]; freezer: string[] }` JSON.
- R2. Missing `/pantry.md` returns `{ staples: [], freezer: [] }` with status 200 — pantry is optional, not an error.
- R3. The `MealLog`/`pantry` entry in `GeneratePlanInput` is replaced with `pantry: { staples: string[]; freezer: string[] }`. The page passes the fetched pantry through; demo-mode passes a fixture.
- R4. `validateInput` in `src/lib/plan/generate.ts` accepts the new shape and rejects malformed pantry input with `InvalidRequestError`.
- R5. The plan-generation prompt distinguishes staples (unconditional grocery-list exclusion) from freezer (available stock to consider when picking).
- R6. Generated grocery lists demonstrably exclude any item that case-insensitively matches a `staples` entry — verified by reading the prompt instruction; behavior is LLM-dependent.
- R7. Generated plans, when the freezer contains protein, prefer recipes that use that protein. Verifiability is qualitative.
- R8. `DEMO_MODE=1` short-circuits `GET /api/pantry` with a `DEMO_PANTRY` fixture (a few staples + one or two freezer items) and `X-Demo-Mode: 1`.
- R9. The page's mount `Promise.all` extends from three calls to four (`fetchRecipes`, `fetchDeals`, `fetchRecentLogs`, `fetchPantry`). Pantry-fetch failure degrades to empty pantry with a non-blocking toast — the page still renders.
- R10. `pantry.md` parsing is done with `gray-matter`, matching the recipe and log parsers.

---

## Scope Boundaries

- No UI for editing `pantry.md`. The user edits it directly in GitHub.
- No automatic freezer-stock decrement when a meal is cooked — freezer is manually maintained per the issue.
- No expiration logic for freezer items. The freetext date is informational; the LLM judges freshness.
- No multi-pantry / multi-household support.
- No staples auto-detection from grocery-list patterns.
- No `POST /api/pantry` write endpoint. Pantry is read-only from the app's perspective.
- No write to `pantry.md` during cooking — `/api/log` (#68) is unrelated.

---

## Context & Research

### Relevant Code and Patterns

- `src/lib/recipes/github.ts` — single-file read pattern with `Bearer` auth, `Accept: application/vnd.github.raw` for file content, error mapping (`MissingEnvVarError`, `GitHubAuthError`, `GitHubNotFoundError`, `GitHubUpstreamError`). The pantry reader is structurally similar but reads exactly one file at a fixed path.
- `src/lib/log/parse.ts` — frontmatter parsing via `gray-matter`, type-narrowed shape validation, custom `LogParseError` with file context. The pantry parser mirrors this style but for a single document with two array fields.
- `src/lib/log/recent.ts` — 404 → empty result (graceful fallback) pattern. Pantry follows the same: missing file is not an error.
- `src/app/api/recipes/route.ts` — thin route handler, error class fan-out, no body validation (GET only).
- `src/app/api/log/route.ts` — demo-mode short-circuit pattern, `X-Demo-Mode: 1` header convention.
- `src/lib/api/client.ts` — typed `fetchRecipes`, `fetchDeals`, `fetchRecentLogs` pattern. Adding `fetchPantry()` follows the same shape.
- `src/lib/plan-ui/use-plan-state.ts` — parallel mount fetch (currently 3-way). Extends to 4-way with the same degrade-to-empty + toast pattern used for `fetchRecentLogs`.
- `src/lib/plan/types.ts` — current `pantry: string[]` placeholder. Replacing it with the richer shape mirrors the recent `MealLog` swap in #68.
- `src/lib/plan/prompt.ts` — current rule "Do NOT include any item that matches a pantry entry (case-insensitive)". Updated to distinguish staples from freezer.
- `src/lib/demo/fixtures.ts` — `DEMO_*` fixture pattern. Add `DEMO_PANTRY: Pantry`.

### Institutional Learnings

- `docs/solutions/build-errors/` — no directly applicable learnings.
- The `MealLog` shape change in #68 (placeholder → real shape) is the freshest precedent for breaking `GeneratePlanInput`. Same pattern applies here: re-export from a feature module, update validator, update prompt, update fixtures, follow the type errors.

### External References

- GitHub REST: [Get repository content](https://docs.github.com/en/rest/repos/contents#get-repository-content). Single-file read returns `{ content (base64), sha, ... }`. We can use `Accept: application/vnd.github.raw` to skip the base64 step (matches existing `src/lib/recipes/github.ts`).

---

## Key Technical Decisions

- **Pantry shape: `{ staples: string[]; freezer: string[] }`.** User-confirmed. Matches the issue's two-list semantics; lets the prompt distinguish hard exclusion from soft preference. Swap is a breaking change to `GeneratePlanInput` mirroring the `MealLog` change in #68 — small blast radius (one route handler + page mount + demo fixture).
- **`pantry.md` content is YAML frontmatter only.** No body. The example shows `--- ... ---` with no markdown after. Parser uses `gray-matter` and reads `data.staples` and `data.freezer`; the file body is ignored.
- **Freezer entries are freetext strings, preserved verbatim.** "ground beef (Costco, bought 2026-04-10)" stays as a single string. The LLM parses freshness from the freetext. Avoids over-engineering a structured freezer-item type that the user has to maintain by hand.
- **Missing file → empty pantry (200, not 404).** R2. Matches the issue's "Missing `/pantry.md` is handled gracefully" requirement. Symmetric with `GET /api/log` returning `[]` when `/log/` doesn't exist yet.
- **GitHub reader uses raw Accept header.** `application/vnd.github.raw` returns file contents directly (no base64 decode), matching `src/lib/recipes/github.ts`. Faster and simpler than the JSON contents API for read-only use.
- **No caching layer.** Pantry is small, requests are infrequent (one per page mount). If latency becomes an issue, Next.js `fetch` Data Cache can be enabled later, but YAGNI for now.
- **Validator follows the depth of #68's `MealLog` validator.** Per-field shape checks (`Array.isArray`, `every typeof string`), with `pantry.staples` and `pantry.freezer` as the field paths in `InvalidRequestError`.
- **Prompt updates are surgical.** Replace the existing "PANTRY (omit from grocery list):" instruction with two clearer rules — one for staples (hard exclusion) and one for freezer (soft preference + grocery-list deduplication of overlapping protein). Keep JSON-encoding the input so the model sees the structure.
- **`fetchPantry` failure on mount → empty pantry, non-blocking toast.** Pantry is nice-to-have; the page should still render with degraded plan quality if `/api/pantry` is down. Mirrors the existing `fetchRecentLogs` failure-handling.
- **Demo-mode fixture: 6-8 staples + 2 freezer entries.** Realistic-looking, no PII. Sufficient to exercise the prompt instruction in demo runs.
- **Strict on input element type, lenient on duplicates.** If `staples` contains the same item twice, accept it — the LLM doesn't care. If it contains a non-string, reject with 502 (parser-level) or 400 (route-level).

---

## Open Questions

### Resolved During Planning

- Pantry shape: `{ staples, freezer }` object (user-confirmed).
- File format: YAML frontmatter only, no body.
- Freezer freetext preservation: yes, verbatim.
- Missing-file behavior: 200 with empty pantry (R2).
- Endpoint method: `GET /api/pantry` (no `POST`; pantry is read-only from the app).
- Caching: none in this PR.

### Deferred to Implementation

- The exact wording of the two new prompt instruction lines. The current prompt phrasing is short and direct; the implementer can iterate on the staples/freezer wording after seeing real plans. Keep the JSON-encoded `pantry` block as-is.
- Whether to lower-case staples before stringification in the prompt. The current rule says "case-insensitive" omission — relying on the LLM. If matching is sloppy in practice, add a normalization pass on the server. Defer until observed.
- Whether the parser should also accept `staples` as a string-with-newlines (a common YAML hand-edit alternative to `- list`). Default: array only; surface a clear `PantryParseError` if the user has a non-array. Reconsider only if friction emerges.

---

## Implementation Units

- U1. **Pantry types + parser**

**Goal:** Define `Pantry` and a pure parser that reads `pantry.md` source into `{ staples, freezer }`.

**Requirements:** R10.

**Dependencies:** None.

**Files:**
- Create: `src/lib/pantry/types.ts`
- Create: `src/lib/pantry/parse.ts`
- Create: `src/lib/pantry/parse.test.ts`

**Approach:**
- `Pantry` is `{ staples: string[]; freezer: string[] }` — the canonical shape, re-exported by `src/lib/plan/types.ts`.
- `parsePantryFile(source: string, filename: string): Pantry` runs `gray-matter` on the source, validates `data.staples` and `data.freezer` are arrays of strings (or absent → empty array), and returns the typed `Pantry`.
- `PantryParseError` follows the `RecipeParseError` / `LogParseError` shape with `filename` + message.
- An empty file or a file with only frontmatter and no `staples`/`freezer` keys parses to `{ staples: [], freezer: [] }`.
- Whitespace and stray `staples: []` (empty array) are valid.

**Execution note:** Implement test-first per the repo's TDD discipline (`meal-assistant:tdd-vitest`).

**Patterns to follow:**
- `src/lib/recipes/parse.ts` for `gray-matter` usage and the error class shape.
- `src/lib/log/parse.ts` for `isStringArray` helper structure.

**Test scenarios:**
- Happy path: example file from the issue parses to `{ staples: [...8 items], freezer: [...2 items] }` in document order.
- Happy path: empty file → `{ staples: [], freezer: [] }`.
- Happy path: file with only `staples` key (no `freezer`) → `{ staples: [...], freezer: [] }`. Same for the inverse.
- Edge case: leading/trailing whitespace and empty lines parse cleanly.
- Edge case: freezer entry like `chicken thighs (Costco, bought 2026-04-15)` is preserved as a single string.
- Edge case: empty `staples: []` array round-trips to `staples: []`.
- Error path: `staples` is a string (not an array) → `PantryParseError` with field `staples`.
- Error path: `staples: [1, 2]` (non-string entries) → `PantryParseError`.
- Error path: `freezer` is a number → `PantryParseError`.

**Verification:**
- `npm run test -- src/lib/pantry/parse.test.ts` passes.
- The parser is fully pure (no `fetch`, no `process.env`).

---

- U2. **GitHub pantry reader**

**Goal:** Fetch `/pantry.md` from the recipes repo and parse it. Return empty pantry on 404.

**Requirements:** R1, R2.

**Dependencies:** U1.

**Files:**
- Create: `src/lib/pantry/github.ts`
- Create: `src/lib/pantry/github.test.ts`

**Approach:**
- `fetchPantryFromGitHub(): Promise<Pantry>` — single GET to `https://api.github.com/repos/${repo}/contents/pantry.md` with `Accept: application/vnd.github.raw`. On 404, return `{ staples: [], freezer: [] }` (do NOT throw).
- Reuse `MissingEnvVarError`, `GitHubAuthError`, `GitHubUpstreamError` from `src/lib/recipes/github.ts` (re-export pattern, like `src/lib/log/github.ts`).
- Path is hard-coded `pantry.md` at the repo root, sibling to `RECIPES_PATH`. Not configurable.
- Header convention identical to existing GitHub reads: `Bearer ${pat}`, `User-Agent: meal-assistant`, `X-GitHub-Api-Version: 2022-11-28`.
- Cache: `cache: "no-store"` for now (matches `src/lib/log/recent.ts`).

**Execution note:** Implement test-first.

**Patterns to follow:**
- `src/lib/recipes/github.ts` for the auth/headers + error mapping.
- `src/lib/log/recent.ts` for the 404 → graceful empty pattern.

**Test scenarios:**
- Happy path: 200 with raw markdown content → parsed `Pantry` with the right staples/freezer.
- Happy path: 404 → returns `{ staples: [], freezer: [] }`. No throw.
- Edge case: 200 with empty body → returns `{ staples: [], freezer: [] }`.
- Error path: missing `GITHUB_PAT` → `MissingEnvVarError`.
- Error path: missing `RECIPES_REPO` → `MissingEnvVarError`.
- Error path: 401/403 → `GitHubAuthError`.
- Error path: 500 → `GitHubUpstreamError` with status 500.
- Error path: malformed YAML in the response body → `PantryParseError` (propagated from U1).
- Edge case: never interpolates `GITHUB_PAT` into any thrown error message.

**Verification:**
- `npm run test -- src/lib/pantry/github.test.ts` passes with `globalThis.fetch` stubbed.
- A reader can confirm the auth/header surface matches `src/lib/recipes/github.ts` by visual diff.

---

- U3. **`GET /api/pantry` route**

**Goal:** Thin route that wraps the reader, fans errors out to status codes, and short-circuits in demo mode.

**Requirements:** R1, R2, R8.

**Dependencies:** U2.

**Files:**
- Create: `src/app/api/pantry/route.ts`
- Create: `src/app/api/pantry/route.test.ts`

**Approach:**
- `export async function GET(): Promise<Response>` (no body, no query params).
- Demo-mode short-circuit at the top of the handler: returns `DEMO_PANTRY` (added in U5) with `X-Demo-Mode: 1` header. No GitHub calls.
- Otherwise call `fetchPantryFromGitHub()` and return JSON.
- Error mapping mirrors `src/app/api/recipes/route.ts`:
  - `MissingEnvVarError` → 500
  - `GitHubAuthError` → 502 with hint to check `GITHUB_PAT`
  - `GitHubUpstreamError` → 502 with status detail
  - `PantryParseError` → 502 with the parser's filename context
  - Unknown → 500 + `console.error`

**Execution note:** Test-first; route handler tests follow the `src/app/api/log/route.test.ts` pattern.

**Patterns to follow:**
- `src/app/api/recipes/route.ts` for error class fan-out.
- `src/app/api/log/route.ts` for demo-mode short-circuit and error mapping table.

**Test scenarios:**
- Happy path: reader returns a `Pantry` → 200 with the JSON body verbatim.
- Happy path: `DEMO_MODE=1` → returns `DEMO_PANTRY`, sets `X-Demo-Mode: 1`, never calls the reader.
- Error path: reader throws `MissingEnvVarError` → 500.
- Error path: reader throws `GitHubAuthError` → 502 + body mentions `GITHUB_PAT`.
- Error path: reader throws `GitHubUpstreamError` (status 500) → 502.
- Error path: reader throws `PantryParseError` → 502 with the file/error detail.

**Verification:**
- `npm run test -- src/app/api/pantry/route.test.ts` passes with the reader mocked.
- The route's response shape matches the `Pantry` JSON contract verbatim.

---

- U4. **Plan generator wiring (types, validator, prompt)**

**Goal:** Replace `pantry: string[]` with the new `Pantry` shape across the plan module — types, validator, prompt — and update tests.

**Requirements:** R3, R4, R5.

**Dependencies:** U1.

**Files:**
- Modify: `src/lib/plan/types.ts` (re-export `Pantry` from `@/lib/pantry/types`; replace `pantry: string[]` with `pantry: Pantry` in `GeneratePlanInput`)
- Modify: `src/lib/plan/generate.ts` (`validateInput` validates the new shape)
- Modify: `src/lib/plan/generate.test.ts`
- Modify: `src/lib/plan/prompt.ts` (replace the single "PANTRY" instruction with two: staples + freezer)
- Modify: `src/lib/plan/prompt.test.ts`

**Approach:**
- `Pantry` re-exported from `src/lib/plan/types.ts` so consumers in the plan module don't pierce into `@/lib/pantry/types` directly. Same convention as `MealLog`.
- `validateInput` adds a `validatePantry(value, path)` helper that asserts `pantry` is an object with `staples` and `skipped` arrays of strings (allowing absent/empty fields). Bad shape → `InvalidRequestError` with the field path (e.g., `pantry.staples`).
- `prompt.ts` updates the picking-rules block to add: "When the freezer contains items the household already paid for, prefer recipes that use that protein. Avoid listing those proteins on the grocery list." It also replaces the single grocery-list pantry rule with: "Do NOT include any item that matches a `pantry.staples` entry (case-insensitive). Do NOT include any item already covered by `pantry.freezer` (case-insensitive — match the protein name, ignoring date/store metadata in parens)."
- The user-message JSON block changes from `PANTRY (omit from grocery list): [...]` to `PANTRY:\n${JSON.stringify(input.pantry)}` — the model sees the full `{ staples, freezer }` object.
- All existing tests using `pantry: []` (the empty-string-array placeholder) update to `pantry: { staples: [], freezer: [] }`.

**Execution note:** Test-first. Touch the type first, then let the type errors guide the validator and tests. Same playbook as #68's `MealLog` swap.

**Patterns to follow:**
- `src/lib/plan/generate.ts:validateInput` for validation style.
- `src/lib/plan/prompt.ts` for the existing instruction-line conventions.

**Test scenarios:** *(validator)*
- Happy path: `validateInput({ ..., pantry: { staples: ["salt"], freezer: ["beef"] } })` returns the typed pantry.
- Happy path: `pantry: { staples: [], freezer: [] }` is accepted (empty pantry).
- Happy path: `pantry: {}` is accepted as `{ staples: [], freezer: [] }` after defaulting (or rejected — implementer's choice). **Decision:** require both keys present; reject on missing for clearer errors.
- Error path: `pantry: undefined` → `InvalidRequestError` with field `pantry`.
- Error path: `pantry: ["salt"]` (the old shape) → `InvalidRequestError` with field `pantry`.
- Error path: `pantry.staples` is a number → `InvalidRequestError` with field `pantry.staples`.
- Error path: `pantry.freezer` contains a non-string → `InvalidRequestError` with field `pantry.freezer`.

**Test scenarios:** *(prompt)*
- Happy path: `buildSystemPrompt()` includes the staples-exclusion line and the freezer-preference line.
- Happy path: `buildUserMessage(input)` JSON-encodes the full `pantry` object (assert the user-message text contains both `staples` and `freezer` keys).

**Verification:**
- Full suite green after the type swap propagates.
- Generated prompt visibly mentions both staples and freezer roles.

---

- U5. **Page integration + demo fixture**

**Goal:** Wire the new pantry into the page mount fetch chain and add the demo-mode fixture.

**Requirements:** R3, R8, R9.

**Dependencies:** U3, U4.

**Files:**
- Modify: `src/lib/api/client.ts` (add `fetchPantry()`)
- Modify: `src/lib/api/client.test.ts`
- Modify: `src/lib/plan-ui/state.ts` (ready state gains `pantry: Pantry`; INIT_OK action carries `pantry`)
- Modify: `src/lib/plan-ui/state.test.ts`
- Modify: `src/lib/plan-ui/use-plan-state.ts` (4-way `Promise.all`; pass pantry into generatePlan body)
- Modify: `src/lib/plan-ui/use-plan-state.test.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/lib/demo/fixtures.ts` (add `DEMO_PANTRY`)
- Modify: `src/lib/demo/fixtures.test.ts`

**Approach:**
- `fetchPantry(): Promise<Pantry>` returns `getJson<Pantry>("/api/pantry")`.
- `usePlanState` extends the `Promise.all` to four calls. Like `fetchRecentLogs`, pantry failures degrade to `{ staples: [], freezer: [] }` with a non-blocking warning toast — the page still renders with reduced plan quality.
- `PlanState`'s ready branch carries `pantry: Pantry`. `regenerate` and `swap` pass the stored pantry into subsequent `generatePlan` calls.
- `INIT_OK` action shape gains `pantry: Pantry`. All places that dispatch `INIT_OK` now supply it.
- `DEMO_PANTRY` is a small fixture with 6-8 staples and 2 freezer entries (e.g., `chicken thighs (Costco, bought 2026-04-15)`). Returned by `GET /api/pantry` in demo mode.

**Execution note:** Test-first.

**Patterns to follow:**
- `src/lib/plan-ui/use-plan-state.ts` already has the 3-way parallel + `fetchRecentLogs` graceful-degrade pattern. Extend exactly the same way.
- `src/lib/demo/fixtures.ts` for fixture conventions.
- `src/app/page.test.tsx` and `src/lib/plan-ui/use-plan-state.test.tsx` for the mock-and-mount pattern; add `fetchPantryMock` symmetric with `fetchRecentLogsMock`.

**Test scenarios:** *(client)*
- Happy path: `fetchPantry()` GETs `/api/pantry` and returns the parsed JSON body.
- Error path: non-2xx → `ApiError` with `endpoint: "/api/pantry"` and the upstream message.

**Test scenarios:** *(state reducer)*
- Happy path: `INIT_OK` with a non-empty pantry sets `state.pantry` to that pantry.
- Happy path: subsequent `REGEN_OK`/`SWAP_OK` preserves `state.pantry`.

**Test scenarios:** *(hook)*
- Happy path: mount fetches all four (recipes, deals, logs, pantry) in parallel and includes the pantry in the generate-plan body.
- Edge case: `fetchPantry` rejects → state still transitions to ready with `pantry: { staples: [], freezer: [] }`; warning toast fires; generate-plan still called.
- Happy path: regenerate after a successful mount uses the stored pantry (not a re-fetched one).

**Test scenarios:** *(page)*
- Happy path: page renders with all four mocks resolving; assert the generate-plan call body contains the pantry.

**Test scenarios:** *(demo fixture)*
- Happy path: `DEMO_PANTRY.staples.length >= 5` and `DEMO_PANTRY.freezer.length >= 1`.
- Happy path: every entry is a non-empty string.

**Verification:**
- `npm test` clean.
- `npm run lint` clean.
- `npm run build` clean.
- Visual check in `npm run dev` with `DEMO_MODE=1`: network panel shows `GET /api/pantry` returning the demo fixture; the generated grocery list does not include items from `DEMO_PANTRY.staples`.

---

## System-Wide Impact

- **Interaction graph:** Mount fetch fan-out grows from 3 to 4 calls. Generate-plan body grows by one nested object. No new callbacks or middleware.
- **Error propagation:** `/api/pantry` failures during mount degrade gracefully (toast + empty pantry). `validateInput` failures for malformed pantry surface as 400 from `/api/generate-plan`.
- **State lifecycle risks:** `pantry` becomes part of the steady-state `ready` branch. Regenerate and swap must read from the stored pantry, not re-fetch — the user could update `pantry.md` mid-session, but we accept staleness until the next page reload (matches the recipes/deals/logs lifecycle).
- **API surface parity:** `/api/recipes`, `/api/deals`, `/api/log`, `/api/pantry` now all follow the same `GET → JSON, 502 on upstream, 500 on env, X-Demo-Mode: 1 in demo` convention. New file is symmetric with what's already there.
- **Integration coverage:** Page-level smoke test (`src/app/page.test.tsx`) exercises the full chain with all four mocks. No additional cross-layer integration test needed.
- **Unchanged invariants:** `/api/recipes`, `/api/deals`, `/api/log`, `/api/generate-plan` route behaviors are unchanged except for the typed pantry field in the generate-plan body. The `Recipe`, `Deal`, `MealLog`, `MealPlan` shapes are untouched.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Breaking `GeneratePlanInput.pantry` shape change ripples through fixtures and tests. | All modifications live in U4 + U5 as one atomic propagation. Type errors guide the rest. Same playbook as #68's `MealLog` swap. |
| LLM ignores the staples-exclusion instruction in the prompt. | Verifying behavior is qualitative (R6). The unit tests assert the prompt contains the instruction; observed plan-output behavior is the user's quality bar. If the model regresses, lower-case staples server-side and post-filter the grocery list — defer until observed. |
| User hand-edits `pantry.md` and breaks YAML. | `PantryParseError` surfaces at 502 with a clear filename + detail. The user fixes the file and reloads. |
| Freezer freetext metadata confuses the LLM into not matching the protein name. | Prompt explicitly notes "match the protein name, ignoring date/store metadata in parens". If still flaky, normalize freezer entries server-side in a follow-up. |
| `GITHUB_PAT` write scope (added in #68) is broader than this PR strictly needs. | Read-only is sufficient for `/api/pantry`. No scope change required. The PAT already used for `/api/recipes` works as-is. |
| Pantry-fetch failure on mount blocks the page. | Mirrors `fetchRecentLogs` failure handling: graceful degrade to empty pantry + warning toast. The page still renders. |

---

## Documentation / Operational Notes

- Update `CLAUDE.md` Active Work entry for #69 from descriptive to **Implemented**.
- Update `CLAUDE.md` Source Layout to mention `src/lib/pantry/`.
- Update `CLAUDE.md` Environment Variables: no new env var; mention that `GITHUB_PAT` is also used by `/api/pantry`.
- No new env vars.
- The user must create `pantry.md` in their recipes repo for the feature to do anything in production. Missing file is fine (R2).

---

## Sources & References

- Issue: [#69 — Pantry awareness: read /pantry.md and exclude staples from grocery list](https://github.com/dancj/meal-assistant/issues/69)
- Existing module precedent: `src/lib/log/` (#68) and `src/lib/recipes/` (#64)
- Plan generator consumer: `src/lib/plan/types.ts`, `src/lib/plan/generate.ts`, `src/lib/plan/prompt.ts`
- Page mount fetch chain: `src/lib/plan-ui/use-plan-state.ts`
- Demo fixtures: `src/lib/demo/fixtures.ts`
- TDD discipline: `.claude/skills/meal-assistant/tdd-vitest/SKILL.md` (per CLAUDE.md mandate)
- GitHub Contents API: <https://docs.github.com/en/rest/repos/contents#get-repository-content>
