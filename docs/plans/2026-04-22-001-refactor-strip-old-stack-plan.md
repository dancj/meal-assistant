---
title: "refactor: Strip old stack (Supabase, Gemini, SQLite, cron)"
type: refactor
status: active
date: 2026-04-22
origin: https://github.com/dancj/meal-assistant/issues/63
---

# refactor: Strip old stack (Supabase, Gemini, SQLite, cron)

## Overview

Remove the unfinished original stack from this repo so later issues (#64–#70) can build the new one on a clean base. Deletes Supabase client code, Gemini client code, the SQLite storage layer, the weekly cron workflow, and all API routes / pages / tests that depend on them. Keeps the Next.js App Router shell, Tailwind + shadcn UI primitives, and the Resend library (demoted to an optional email button in #70).

---

## Problem Frame

The original MVP wired Supabase + Gemini + Resend + a weekly GitHub Actions cron, but setup friction meant it never shipped end-to-end. The refactor plan (issue #63 and `~/Downloads/mealplan.md` handoff) replaces that stack with a private-GitHub-repo recipe store, Claude for generation, Flipp for deals, and an on-demand UI. Before building the new pieces, the old ones need to go — leaving them in place risks dead imports, stale env vars leaking into new code, and confused reviewers.

This plan is purely removal + minimal scaffolding so the project still builds. It introduces no new behavior.

---

## Requirements Trace

- R1. All Supabase client code and imports (`@supabase/supabase-js`) are removed from the repo.
- R2. All Gemini client code and imports (`@google/genai`) are removed from the repo.
- R3. The SQLite storage layer (`better-sqlite3`, `src/lib/storage/*`, `data/meal-assistant.db`) is removed — per the handoff's "Do not reintroduce Supabase or any database" directive.
- R4. The weekly cron workflow (`.github/workflows/weekly-meal-plan.yml`) is deleted.
- R5. Recipe fetch logic tied to Supabase is removed (routes, pages, components, tests).
- R6. The Next.js / TypeScript project structure, Vercel config, Tailwind v4 + shadcn UI primitives, and Resend library remain intact.
- R7. `.env.example` no longer advertises Supabase, Gemini, or legacy CRON variables.
- R8. `npm run build`, `npm run lint`, `npm test`, and `npx tsc --noEmit` all succeed on the stripped tree.

---

## Scope Boundaries

- No new API routes, pages, or features — those land in #64–#70.
- No new env vars added to `.env.example`; new keys land with the feature that consumes them (#64 adds GitHub, #66 adds Anthropic, #70 adds Resend).
- Resend library and its tests (`src/lib/resend.ts`, `src/lib/email.ts`, `src/lib/email.test.ts`) stay — they're repurposed in #70.
- Cypress framework and config stay; only stale specs tied to removed UI are deleted. New e2e specs ship with the new UI.
- The CI workflow (`.github/workflows/ci.yml`) stays as-is; it has no Supabase/Gemini coupling.

### Deferred to Follow-Up Work

- New env var additions (`ANTHROPIC_API_KEY`, `GITHUB_PAT`, `RECIPES_REPO`, `RECIPES_PATH`, `SAFEWAY_ZIP`, `ALDI_ZIP`): added by the feature issues that first use them — #64 (GitHub/recipe), #65 (ZIPs), #66 (Anthropic).
- New recipe/meal-plan/deal types: defined in #64, #65, #66. Old `src/types/recipe.ts` and `src/types/meal-plan.ts` are removed here since their shapes no longer match.

---

## Context & Research

### Relevant Code and Patterns

- **Consumers of `@supabase/supabase-js`:** `src/lib/supabase.ts`, `src/lib/storage/supabase.ts`, `src/lib/storage/index.ts`, `src/lib/demo-mode.ts`, `src/app/api/status/route.ts`.
- **Consumers of `@google/genai`:** `src/lib/gemini.ts`, `src/app/api/generate-plan/route.ts`.
- **Consumers of `better-sqlite3`:** `src/lib/storage/sqlite.ts` only; `src/lib/storage/index.ts` auto-selects SQLite vs Supabase.
- **Cron-only plumbing:** `src/lib/auth.ts` (CRON_SECRET bearer check) + `.github/workflows/weekly-meal-plan.yml`. The cron is the only caller of the bearer check — the new on-demand UI doesn't use it.
- **Demo/seed scaffolding (SQLite-era):** `src/lib/demo-data.ts`, `src/lib/demo-mode.ts`, `src/components/DemoBanner.tsx` all assume Supabase-or-local. They go.
- **App Router surfaces that fetch the removed routes:** `src/app/page.tsx`, `src/app/generate/page.tsx`, `src/app/plans/page.tsx`, `src/app/recipes/**`. All deleted; `page.tsx` replaced with a placeholder.
- **Kept shell:** `src/app/layout.tsx`, `src/app/globals.css`, `src/app/favicon.ico`, `src/components/ui/*`, `src/test/{helpers,setup}.ts`, `src/lib/utils.ts`.

### Institutional Learnings

- `docs/solutions/build-errors/` is the only populated solutions directory; nothing directly applicable to deletion work.
- Prior plans in `docs/plans/` document the Supabase/Gemini MVP being built — this refactor is the unwind.

### External References

None needed — pure removal against a known tree.

---

## Key Technical Decisions

- **Delete old types outright rather than leaving them as "legacy" shapes.** The new `Recipe`, `MealPlan`, and `Deal` types land in #64/#66 with different shapes (markdown frontmatter + `kidVersion`, store-grouped grocery list, `dealMatch`). Keeping old types around would mislead reviewers of later PRs. Rationale: types are cheap to reintroduce and their current contents have no salvage value.
- **Replace `src/app/page.tsx` with a minimal placeholder** rather than deleting it. App Router requires a root page; the UI rebuild in #67 will overwrite it. Rationale: keeps the build green and makes the intent visible in diffs.
- **Delete `src/lib/auth.ts` along with the cron workflow.** Its only job is CRON_SECRET bearer-check on `/api/generate-plan`, and both the caller and the endpoint are being removed. The new on-demand model has no bearer-protected endpoints. Rationale: keeping unused auth code invites confusion about whether new routes should adopt it.
- **Keep `src/lib/resend.ts` and `src/lib/email.ts` as-is,** even if they currently import removed types. If they fail to typecheck after deletions, strip the offending imports but do not rewrite logic. Rationale: #70 will rebuild the call site anyway; minimal surgery here avoids wasted work.
- **Do not pre-populate *new* env vars in `.env.example`.** Each feature issue adds the keys it needs on the PR that first reads them. Rationale: keeps each PR self-contained and reviewable; avoids phantom env vars that reference nothing. Resend keys are the one exception — they're retained (not "new") because the library itself survives this refactor for use by #70; keeping them in `.env.example` preserves continuity rather than introducing a forward reference.
- **Delete stale cypress specs but keep the framework.** The four existing specs (`recipe-*.cy.ts`) exercise removed UI. Rationale: #67 will add new specs against the new UI — dropping the framework would force reinstalling it.

---

## Open Questions

### Resolved During Planning

- *Keep `src/types/recipe.ts` and `src/types/meal-plan.ts` or delete?* → Delete. New shapes differ and will be redefined in #64/#66.
- *Remove `CRON_SECRET` from `.env.example`?* → Yes. No remaining consumer in the new design.
- *Should cypress remain installed?* → Yes. Framework stays, stale specs go.

### Deferred to Implementation

- If `src/lib/email.ts` imports the deleted `MealPlan` type, minimal local shim vs full rewrite — decide at the keyboard. The right answer is the smallest change that makes the file compile, since #70 rewrites it anyway.
- Exact `package-lock.json` churn after dependency removal — regenerate by running `npm install` and commit the result.

---

## Implementation Units

- [ ] U1. **Delete consumer code: API routes, pages, components, and their tests**

**Goal:** Remove every file that reads from Supabase, calls Gemini, or renders the Supabase-backed recipe UI. Replace the root page with a minimal placeholder so the app still builds.

**Requirements:** R1, R2, R5, R6, R8

**Dependencies:** None.

**Files:**
- Delete: `src/app/api/generate-plan/route.ts`
- Delete: `src/app/api/generate-plan/route.test.ts`
- Delete: `src/app/api/plan/current/route.ts` (and `src/app/api/plan/` if empty after)
- Delete: `src/app/api/plan/current/route.test.ts`
- Delete: `src/app/api/plans/route.ts`
- Delete: `src/app/api/plans/route.test.ts`
- Delete: `src/app/api/preferences/default/route.ts` (and `src/app/api/preferences/` if empty after)
- Delete: `src/app/api/preferences/default/route.test.ts`
- Delete: `src/app/api/recipes/route.ts`
- Delete: `src/app/api/recipes/route.test.ts`
- Delete: `src/app/api/recipes/[id]/route.ts` (and the `[id]` dir)
- Delete: `src/app/api/status/route.ts` (and `src/app/api/status/` if empty after)
- Delete: `src/app/generate/page.tsx` (and `src/app/generate/`)
- Delete: `src/app/plans/page.tsx` (and `src/app/plans/`)
- Delete: `src/app/recipes/new/page.tsx`, `src/app/recipes/[id]/page.tsx`, `src/app/recipes/[id]/edit/page.tsx` (and all `src/app/recipes/` subtrees)
- Delete: `src/app/page.component.test.tsx`
- Delete: `src/components/RecipeList.tsx`
- Delete: `src/components/RecipeForm.tsx`
- Delete: `src/components/RecipeForm.test.tsx`
- Delete: `src/components/DeleteButton.tsx`
- Delete: `src/components/DemoBanner.tsx`
- Modify: `src/app/page.tsx` — replace entire contents with a minimal placeholder component (plain text such as "Meal Assistant — refactor in progress") so App Router has a root page and the build passes.
- Modify: `src/app/layout.tsx` — remove the `DemoBanner` import and render (it's being deleted above) and remove the nav links to `/plans`, `/generate`, `/recipes/new` (those routes are gone). Keep the title, theme provider, `Toaster`, and the basic `<html>/<body>` shell — those are reused by #67. Do not add new nav; #67 builds the single-page UI.

**Approach:**
- Work outside-in: delete the pages and components that render removed routes first, then the routes themselves, then strip `layout.tsx` of references to deleted modules, then the root `page.tsx` rewrite. This keeps TypeScript errors from cascading between related deletions.
- Leave `src/app/globals.css` and `src/app/favicon.ico` untouched.
- Leave every file under `src/components/ui/` untouched — shadcn primitives stay.
- The placeholder `page.tsx` should not import anything from `src/lib/` or `src/types/` — those shrink heavily in U2 and a zero-dependency placeholder avoids churn.

**Patterns to follow:**
- None. Deletion + trivial replacement.

**Test scenarios:**
- Test expectation: none — this unit removes feature code without replacing behavior. Verified by build + lint + typecheck in U4.

**Verification:**
- `src/app/api/` contains no routes and no subdirectories.
- `src/app/` contains only `layout.tsx` (stripped), `page.tsx` (placeholder), `globals.css`, `favicon.ico` — no `recipes/`, `plans/`, `generate/`, or `api/` subdirectories remain.
- `src/components/` contains only `ui/` after this unit.
- `src/app/layout.tsx` no longer imports `@/components/DemoBanner` and contains no Links to removed routes.
- `grep -rln "from \"@/components/RecipeList\"\|from \"@/components/RecipeForm\"\|from \"@/components/DeleteButton\"\|from \"@/components/DemoBanner\"" src` returns no matches.

---

- [ ] U2. **Delete lib modules: Supabase, Gemini, storage, demo, auth, old types**

**Goal:** With the consumers gone (U1), remove the underlying modules and types they depended on.

**Requirements:** R1, R2, R3, R5

**Dependencies:** U1 (consumers must be gone first, otherwise typecheck explodes with missing-import noise during review).

**Files:**
- Delete: `src/lib/supabase.ts`
- Delete: `src/lib/gemini.ts`
- Delete: `src/lib/storage/sqlite.ts`
- Delete: `src/lib/storage/supabase.ts`
- Delete: `src/lib/storage/types.ts`
- Delete: `src/lib/storage/index.ts` (and the `src/lib/storage/` dir)
- Delete: `src/lib/demo-mode.ts`
- Delete: `src/lib/demo-data.ts`
- Delete: `src/lib/auth.ts`
- Delete: `src/lib/auth.test.ts`
- Delete: `src/lib/recipe-validation.ts` (Supabase-shape validator; new schema lands in #64)
- Delete: `src/types/recipe.ts`
- Delete: `src/types/meal-plan.ts` (and `src/types/` if empty)
- Modify: `src/lib/email.ts` — it imports `MealPlan` from `@/types/meal-plan` (deleted above) and uses it throughout the HTML template. Minimum surgery: comment out the type import and every line that references the deleted shape, wrapping the commented block with a single `// TODO #70: rebuild with new MealPlan shape` marker at the top of the function body. Do not rewrite logic.
- Modify: `src/lib/email.test.ts` — it independently imports `MealPlan` from `@/types/meal-plan` and uses the shape in `samplePlan()`. Apply the same commenting treatment to the type import and any assertions that reference deleted fields, so `vitest` and `tsc --noEmit` both stay green. If the commenting leaves the test file empty of runnable assertions, `it.skip` the suite with the same TODO marker.
- Keep untouched: `src/lib/utils.ts`, `src/lib/resend.ts`.

**Approach:**
- Delete in the order listed so each removal's consumers are already gone.
- After deletions, run `npx tsc --noEmit` once to find any lingering references and patch them (expected candidate: `src/lib/email.ts` type import).
- Do not introduce new types, interfaces, or stubs in this unit — the new shapes belong in later issues.

**Patterns to follow:**
- None.

**Test scenarios:**
- Test expectation: none — deletion only. Tests that covered these modules are deleted alongside them.

**Verification:**
- `src/lib/` contains only `utils.ts`, `resend.ts`, `email.ts`, `email.test.ts`.
- `src/types/` is empty or removed.
- `grep -rln "@supabase/supabase-js\|@google/genai\|better-sqlite3" src` returns no matches.
- `npx tsc --noEmit` passes.

---

- [ ] U3. **Remove cron workflow and clean up cypress wiring**

**Goal:** Delete the weekly cron job and its support, and unplug Supabase env vars from the cypress workflow. Drop the four stale e2e specs; keep the cypress framework installed for #67.

**Requirements:** R4, R6, R8

**Dependencies:** None (can run in parallel with U1/U2, but sequencing it after avoids interleaved review).

**Files:**
- Delete: `.github/workflows/weekly-meal-plan.yml`
- Modify: `.github/workflows/cypress.yml` — remove the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env blocks from both the `Build` and `Run Cypress` steps.
- Delete: `cypress/e2e/recipe-create.cy.ts`
- Delete: `cypress/e2e/recipe-detail.cy.ts`
- Delete: `cypress/e2e/recipe-edit.cy.ts`
- Delete: `cypress/e2e/recipe-list.cy.ts`
- Keep untouched: `cypress/fixtures/`, `cypress/support/`, `cypress/tsconfig.json`, `cypress.config.*` (if present).

**Approach:**
- After edits, `cypress.yml` should still build the app and invoke `cypress run`; with no specs under `cypress/e2e/`, cypress will report zero specs and pass. That's the intended interim state until #67 adds new specs.
- Leave `ci.yml` untouched — it has no Supabase/Gemini coupling.

**Patterns to follow:**
- None.

**Test scenarios:**
- Test expectation: none — infrastructure only.

**Verification:**
- `.github/workflows/` contains `ci.yml` and `cypress.yml` only.
- `grep -n "SUPABASE" .github/workflows/cypress.yml` returns no matches.
- `cypress/e2e/` is empty.

---

- [ ] U4. **Prune dependencies, `.env.example`, and the local SQLite artifact**

**Goal:** Drop removed packages from `package.json`, refresh the lockfile, scrub `.env.example` of legacy keys, and remove the on-disk SQLite database.

**Requirements:** R1, R2, R3, R7, R8

**Dependencies:** U1, U2, U3 (lockfile refresh should reflect final import graph).

**Files:**
- Modify: `package.json` — remove from `dependencies`: `@supabase/supabase-js`, `@google/genai`, `better-sqlite3`. Remove from `devDependencies`: `@types/better-sqlite3`. Leave `resend` intact. Do not touch `cypress`, `vitest`, or any other dev tooling.
- Modify: `package-lock.json` — regenerate by running `npm install` after editing `package.json`.
- Modify: `.env.example` — remove the `# Supabase`, `# Google Gemini`, `DIETARY_PREFERENCES`, and `# API Security` / `CRON_SECRET` blocks. Keep the `# Resend` block (it's still optional and is used by #70). Result should be a short file with just the Resend keys, so later issues have a clean anchor to add to.
- Delete: the entire `data/` directory (includes `data/meal-assistant.db`, plus any SQLite WAL/SHM sidecars like `data/meal-assistant.db-wal` and `data/meal-assistant.db-shm` that `better-sqlite3` leaves behind in WAL mode).
- Modify: `.gitignore` — add `data/` if not already ignored, so any stray local DB a contributor has doesn't reappear. Check first; no-op if present.

**Approach:**
- Run `npm install` after `package.json` edits to regenerate the lockfile cleanly — do not hand-edit `package-lock.json`.
- Do not add new env vars in this PR. Each feature issue adds its own.
- Verify the tree builds end-to-end before closing the unit: `npm run lint && npm test && npx tsc --noEmit && npm run build` should all succeed.

**Patterns to follow:**
- `.env.example` should match the shape of the remaining keys — frugal and uncommented except for section headers.

**Test scenarios:**
- Test expectation: none — cleanup only. Success is the full verification suite below passing.

**Verification:**
- `grep -E "@supabase/supabase-js|@google/genai|better-sqlite3|@types/better-sqlite3" package.json` returns no matches.
- `grep -E "SUPABASE|GEMINI|CRON_SECRET|DIETARY_PREFERENCES" .env.example` returns no matches.
- `data/meal-assistant.db` does not exist.
- `npm run lint` passes.
- `npm test` passes (remaining suite is whatever `email.test.ts` + untouched unit tests cover).
- `npx tsc --noEmit` passes.
- `npm run build` succeeds.

---

## System-Wide Impact

- **Interaction graph:** The on-disk coupling between API routes → `src/lib/storage/*` → SQLite/Supabase is severed entirely. The only remaining lib-level coupling is `src/lib/resend.ts` ↔ `src/lib/email.ts`, preserved for #70.
- **Error propagation:** No runtime code paths remain that could fail on missing env vars — because no code paths read env vars after this refactor (until #64 adds GitHub integration).
- **State lifecycle risks:** `data/meal-assistant.db` could linger on a contributor's checkout. `.gitignore` update ensures it can't sneak back into commits. CI builds start from a clean checkout so this is a local-only concern.
- **API surface parity:** External callers (prior cron workflow, any manual curl) will 404 against removed routes. This is intentional — the cron workflow is deleted in the same PR, and there are no other documented callers.
- **Integration coverage:** Cypress will run against the placeholder landing page with zero specs. Expected. New specs ship in #67.
- **Unchanged invariants:** Next.js App Router structure (`layout.tsx`, `page.tsx`, `globals.css`), Tailwind v4 `@theme` config, shadcn primitives under `src/components/ui/`, Vercel deployment config, CI workflow (`ci.yml`), Vitest + Cypress frameworks. None of these change behavior.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `src/lib/email.ts` transitively imports a removed type and breaks typecheck. | U2 explicitly checks for this and applies minimal surgery; #70 rewrites the file anyway. |
| A hidden consumer of `isDemoMode()` / `isLocalMode()` outside `src/` exists. | `grep -rn "isDemoMode\|isLocalMode\|isGeminiAvailable" .` as a sanity check before merging U2. |
| Contributors with uncommitted work on top of the deleted files lose context. | This is a coordinated refactor per issue #63; no concurrent branches expected. Sole maintainer repo. |
| `npm install` after dependency removal produces a large lockfile diff. | Expected and desirable — reviewers should glance at it but the signal is in `package.json` changes. |
| Cypress workflow runs with zero specs and silently passes, hiding bit-rot. | Accepted for the interim. #67 restores coverage when the new UI lands. |
| `CLAUDE.md` still advertises Supabase + Gemini + "demo data" semantics and will drift from reality after this PR. | Not fixed in this PR to keep scope tight; update can land with #64 (when the new recipe reader provides the replacement story to document). Flag in the PR description. |

---

## Documentation / Operational Notes

- `CLAUDE.md` describes the old stack in several places (Supabase adapter, Gemini generator, weekly cron, demo data). After this PR it will be materially out of date. Flag in the PR description; the right time to refresh is #64, when the new recipe source has a concrete replacement shape to document.
- No deploy-time risk: Vercel env vars for Supabase/Gemini/CRON can be left in place (they'll simply go unread) or removed at the operator's convenience — not part of this plan.
- No migration or data preservation — demo recipes and any locally stored plans are discarded by design.

---

## Sources & References

- **Origin issue:** [#63 — Strip old stack](https://github.com/dancj/meal-assistant/issues/63)
- **Refactor handoff:** `~/Downloads/mealplan.md` (local to the operator; the canonical content is mirrored across issues #63–#70)
- **Downstream issues that depend on this:** #64 (recipe reader), #65 (deals), #66 (plan generator), #67 (UI), #68 (logging), #69 (pantry), #70 (email)
- Related code paths (repo-relative): `src/lib/storage/`, `src/lib/supabase.ts`, `src/lib/gemini.ts`, `.github/workflows/weekly-meal-plan.yml`, `data/meal-assistant.db`, `.env.example`
