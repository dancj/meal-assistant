---
title: "refactor: Post-strip residuals (stale docs + sendMealPlanEmail stub)"
type: refactor
status: active
date: 2026-04-22
origin: https://github.com/dancj/meal-assistant/issues/64
---

# refactor: Post-strip residuals (stale docs + sendMealPlanEmail stub)

## Overview

Clean up two residuals left behind by the stack-strip refactor (#63) before feature work resumes on #64. The repo builds and passes tests, but four human- and agent-facing docs (`CLAUDE.md`, `README.md`, `docs/api.md`, `docs/nanoclaw-setup.md`) still describe the deleted Supabase + Gemini + cron + NanoClaw stack, and a named `sendMealPlanEmail` export in `src/lib/email.ts` throws at runtime. Leaving these in place means any AI-assisted work on #64 is likely to re-seed patterns #63 just removed, and the runtime-throwing export is a latent footgun for anyone who imports it expecting a working function.

This is a hygiene-only plan. No new behavior, no new dependencies, no writing docs for the yet-to-exist #64–#70 stack.

---

## Problem Frame

PR #63 ([refactor/strip-old-stack](https://github.com/dancj/meal-assistant/pull/63)) landed in commit `c09d170` and removed all code for Supabase, Gemini, SQLite, cron auth, and NanoClaw endpoints. Two categories of artifact survived the strip:

1. **Stale documentation.** `CLAUDE.md`, `README.md`, `docs/api.md`, and `docs/nanoclaw-setup.md` still read as if the old stack is live. `CLAUDE.md` is especially load-bearing because it is injected into every Claude Code session in this repo — agents working on #64 will see "Storage: SQLite or Supabase. LLM: Google Gemini. Cron: weekly GitHub Action" and plan accordingly. `README.md` tells new readers to populate env vars (`SUPABASE_URL`, `GEMINI_API_KEY`, `CRON_SECRET`) that no longer do anything. `docs/api.md` documents endpoints that were deleted. `docs/nanoclaw-setup.md` documents an integration that was removed.
2. **Runtime-throwing email stub.** `src/lib/email.ts` exports `sendMealPlanEmail()` as a named async function whose only behavior is `throw new Error("sendMealPlanEmail not implemented — see #70")`. It exists as a "re-entry marker" for #70, but an exported function that throws on call is indistinguishable from a working one at the type level. Its import of `getResend` is kept alive only by `void getResend;`.

Both residuals are cheap to fix and carry measurable risk-of-drift if left for #64's feature work to absorb.

---

## Requirements Trace

- R1. `CLAUDE.md` accurately describes the current repo: Next.js App Router shell, Tailwind v4 + shadcn primitives, Resend library retained but not wired, no database, no LLM, no cron. Clearly signals that feature work is in progress under issues #64–#70.
- R2. `README.md` no longer advertises Supabase, Gemini, cron, or NanoClaw. No `.env` keys are listed that do not exist in `.env.example`. Getting-started steps succeed against the current tree.
- R3. `docs/api.md` is removed. No endpoint docs in the repo until the features that implement them land.
- R4. `docs/nanoclaw-setup.md` is removed. NanoClaw integration is not in the #64–#70 plan.
- R5. `src/lib/email.ts` keeps `parseRecipients` as its only export. The runtime-throwing `sendMealPlanEmail` stub is deleted and is no longer importable.
- R6. `src/lib/email.test.ts` no longer references `sendMealPlanEmail` in comments or suite headers.
- R7. `src/lib/resend.ts` and its `getResend` export stay intact — they are reused in #70.
- R8. `npm run build`, `npm run lint`, `npm test`, and `npx tsc --noEmit` all succeed.

---

## Scope Boundaries

- No writing of new API docs for #64's `/api/recipes` or any other forthcoming endpoint — those ship with the features that create them.
- No rewriting of `README.md` into a future-state "here's how the new stack works" doc. `README.md` is reduced to the truthful current state (refactor in progress, new stack lands across #64–#70) and grows with each feature PR.
- No change to `src/lib/resend.ts` — it is explicitly retained by the #63 strip plan for reuse in #70.
- No change to `parseRecipients` or its tests in `src/lib/email.{ts,test.ts}`.
- No change to `.env.example` — its current minimal `RESEND_*` shape is already correct.
- No change to `docs/design-system.md` — it is stack-agnostic and still accurate.
- No change to historical plans/brainstorms under `docs/plans/` or `docs/brainstorms/` — they are point-in-time records and should remain as they were.
- No change to `docs/solutions/` — out of scope.

### Deferred to Follow-Up Work

- API reference documentation: lands with #64 (`/api/recipes`), #65 (`/api/deals`), #66 (`/api/generate-plan`), #70 (`/api/email`). Each issue is responsible for its own endpoint's docs, colocated with the feature PR. A central `docs/api.md` is not planned; if one is ever wanted again it would be a separate, deliberate decision made after the new surface stabilizes, not a tacit revival of the deleted file.
- Rebuilt `sendMealPlanEmail` (or replacement): lands with #70, which defines the new `MealPlan` shape and email template. This plan intentionally deletes the marker rather than renaming it; #70 will add a fresh, typed export when it has the real shape to send.

---

## Context & Research

### Relevant Code and Patterns

- **`CLAUDE.md`** (53 lines) — describes Supabase/SQLite storage, Gemini LLM, weekly cron, Resend email, `/api/generate-plan`, `/api/plan/current`, `src/lib/storage/`, `src/types/` — all removed in #63.
- **`README.md`** (104 lines) — Tech Stack section lists Supabase + Gemini + GitHub Actions cron; How It Works describes the old flow; Getting Started env snippet lists six vars that are no longer read; NanoClaw Integration section links two docs that are also stale.
- **`docs/api.md`** (303 lines) — documents endpoints (`GET /api/recipes`, `POST /api/generate-plan`, etc.) that no longer exist; references the `CRON_SECRET` bearer auth removed from `src/lib/auth.ts`.
- **`docs/nanoclaw-setup.md`** (126 lines) — NanoClaw integration walkthrough; the endpoints it describes and the auth it relies on were deleted in #63.
- **`src/lib/email.ts`** — two exports: `parseRecipients` (keep) and `sendMealPlanEmail` (delete). The file's import of `getResend` only exists to satisfy the stub.
- **`src/lib/email.test.ts`** — tests only `parseRecipients`; a comment block refers to removed `formatMealPlanEmail`/`sendMealPlanEmail` tests.
- **`src/lib/resend.ts`** — `getResend` factory, no current callers after stub removal; kept for #70 reuse per the #63 strip plan.
- **`.env.example`** — already stripped to `RESEND_*` keys only; no changes needed.

### Institutional Learnings

- `~/.claude/projects/-Users-developer-projects-meal-assistant/memory/feedback_no_pii_in_public_repo.md` — keep docs generic and PII-free. Applies to the `README.md` rewrite: use placeholder URLs (`your-meal-assistant.vercel.app`), do not include personal emails or deployment URLs.
- `docs/plans/2026-04-22-001-refactor-strip-old-stack-plan.md` — #63's plan. R6 there kept Resend library + `src/lib/resend.ts` + `src/lib/email.{ts,test.ts}` intentionally. This plan preserves that intent: we keep `src/lib/resend.ts` and `parseRecipients`; we only drop the stub export that was itself added by #63 as a marker.

### External References

None. This is a repo-internal hygiene pass.

---

## Key Technical Decisions

- **Delete `sendMealPlanEmail` rather than rename to `__notImplemented`.** A renamed private-marker helper still leaves a runtime-throwing function in the tree and still keeps the `getResend` import alive artificially. Deleting it removes the footgun entirely; #70 has an obvious re-entry point because issue #70 itself says "add `/api/email`" and #63's plan explicitly tags email as #70's work. The re-entry marker value is low; the "named export that throws" risk is concrete.
- **Reduce, don't rewrite, `CLAUDE.md` and `README.md`.** The new stack is still being built across five open issues. Writing aspirational docs now risks describing a stack that will not match what actually ships. Both docs get trimmed to the truthful current state ("Next.js + Tailwind + shadcn shell; feature stack lands across #64–#70") and each feature PR extends them as it lands. This matches how `.env.example` was handled in #63.
- **Delete `docs/api.md` and `docs/nanoclaw-setup.md` outright** rather than leaving stub or "deprecated" versions. Nothing in the current tree points to real endpoints; a stub invites drift. `README.md` drops the links that reference them. When #64 ships, its PR can add a fresh per-endpoint doc (or recreate `docs/api.md` with just the new surface).
- **Keep `src/lib/resend.ts` untouched.** #63 already decided it stays for #70. Deleting `sendMealPlanEmail` will make `getResend` temporarily unreferenced, which is acceptable: ESLint flags unused imports, not unused exports, and TypeScript's `noUnusedLocals` / `noUnusedParameters` do not apply to exports.

---

## Open Questions

### Resolved During Planning

- **Ship as its own PR, or bundle into the #64 PR?** Ship as its own PR. The residuals are orthogonal to #64's GitHub recipe reader; bundling muddies the diff and makes review harder. A standalone hygiene PR is small, reviewable, and can land the same day #64 work begins.
- **Should `CLAUDE.md` enumerate issues #64–#70?** Yes, at a link-only level. An agent opening this repo mid-refactor needs to know where the active work lives. A single bullet list of issue links is low-maintenance and high-signal.
- **What about historical plan files under `docs/plans/` that also mention the old stack?** Out of scope. Plans are point-in-time records; the dated filename makes their vintage obvious. Rewriting them would destroy their value as history.

### Deferred to Implementation

- None. This is a pure deletion/rewrite pass; there are no execution-time unknowns.

---

## Implementation Units

- [ ] U1. **Delete `sendMealPlanEmail` stub and clean up `email.ts`**

**Goal:** Remove the runtime-throwing named export and the `getResend` import it keeps alive. `parseRecipients` stays untouched.

**Requirements:** R5, R7, R8

**Dependencies:** None

**Files:**
- Modify: `src/lib/email.ts`

**Approach:**
- Delete the `sendMealPlanEmail` function (lines 23–30 in the current file).
- Delete the `import { getResend } from "@/lib/resend";` line — no longer used.
- Delete the TODO comment block (lines 3–7) that exists only to annotate the stub. `parseRecipients` has no MealPlan dependency and does not need a preamble.
- Final file state: one named export, `parseRecipients`, plus any imports it actually needs (currently none).

**Patterns to follow:**
- Existing `parseRecipients` implementation — do not touch it.
- `src/lib/resend.ts` stays as-is; `getResend` simply becomes unreferenced until #70.

**Test scenarios:**
- Happy path: `parseRecipients` unit tests continue to pass (7 existing cases in `src/lib/email.test.ts`). No new scenarios needed — the removed export had no tests to preserve.

**Verification:**
- `grep -r "sendMealPlanEmail" src/` returns nothing.
- `src/lib/email.ts` exports only `parseRecipients`.
- `npx tsc --noEmit` and `npm test` pass.

---

- [ ] U2. **Scrub `sendMealPlanEmail` reference from `email.test.ts`**

**Goal:** Remove the TODO comment in `src/lib/email.test.ts` that references the deleted export so nothing in the tree suggests a `sendMealPlanEmail` should be tested.

**Requirements:** R6

**Dependencies:** U1 (the comment only makes sense to remove once the stub is gone)

**Files:**
- Modify: `src/lib/email.test.ts`

**Approach:**
- Delete the multi-line comment block at lines 3–6 that says `// TODO #70: restore tests for formatMealPlanEmail and sendMealPlanEmail…`.
- Leave the `parseRecipients` `describe` block and its seven `it` cases untouched.

**Patterns to follow:**
- Existing test style — Vitest `describe`/`it`, `expect(...).toEqual(...)` / `.toThrow(...)`.

**Test scenarios:**
- Test expectation: none — this unit only removes a comment. The existing `parseRecipients` suite must still pass unchanged.

**Verification:**
- After U1 and U2 are both complete, `grep -rE "sendMealPlanEmail|formatMealPlanEmail" src/` returns nothing (U1 removed the code; U2 removed the comment referring to it).
- `npm test` passes with the same 7 `parseRecipients` cases.

---

- [ ] U3. **Delete `docs/api.md` and `docs/nanoclaw-setup.md`**

**Goal:** Remove two docs that describe functionality that no longer exists in the repo and will not return in its current form.

**Requirements:** R3, R4

**Dependencies:** None (can run in parallel with U1/U2; depends on nothing)

**Files:**
- Delete: `docs/api.md`
- Delete: `docs/nanoclaw-setup.md`

**Approach:**
- Delete both files. Neither has any inbound link outside `README.md` (handled in U4); `grep -r "docs/api.md\|docs/nanoclaw-setup.md" .` confirms the only references are in `README.md` and historical plans (which we intentionally do not touch).
- No replacement stub or "deprecated" note — silent removal is cleanest.

**Patterns to follow:**
- Same precedent as #63's deletions of entire `src/lib/storage/`, `src/lib/gemini.ts`, etc. — files that represent deleted functionality are removed, not tombstoned.

**Test scenarios:**
- Test expectation: none — docs removal has no behavioral surface.

**Verification:**
- Both files are gone.
- Running `grep -r "docs/api.md\|docs/nanoclaw-setup.md"` inside `README.md` and `CLAUDE.md` returns nothing (the `README.md` update in U4 is what removes the last live references).

---

- [ ] U4. **Rewrite `README.md` and `CLAUDE.md` to describe the current repo**

**Goal:** Make both docs tell the truth about what exists today, and signal where active work lives so AI-assisted contributions do not reinvent the deleted stack.

**Requirements:** R1, R2, R8

**Dependencies:** None (strictly). Suggested sequencing: land U3 first in the same PR so the `README.md` rewrite can remove the NanoClaw + API Reference links in the same hunk that drops the other stale sections, giving reviewers one coherent diff instead of two passes.

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Approach:**

`README.md` should cover, briefly:
- One-line project summary (meal planning app; current stack under active refactor).
- Current stack: Next.js 15 App Router, React 19, TypeScript, Tailwind v4, shadcn UI primitives, Resend library (retained for future email delivery). No database, no LLM, no cron — yet.
- Commands: `npm run dev`, `npm run build`, `npm run lint`, `npm test`, Cypress commands.
- Refactor-in-progress pointer: link to issues #64–#70 as the roadmap for the new stack (GitHub-repo recipe store, Claude generation, Flipp deals, on-demand UI, optional email).
- Contributing + License (unchanged).
- Remove: Tech Stack bullets for Supabase/Gemini/cron; How It Works steps; Features list (none of those features currently exist in the tree); NanoClaw Integration section; Getting Started env snippet that lists removed vars; Dietary Preferences section (behavior gone until #66). `.env.local` guidance reduces to "see `.env.example`".

`CLAUDE.md` should cover, briefly:
- Project Overview: current state + note that the legacy stack was stripped in #63 and the new stack lands across #64–#70.
- Commands (unchanged — those still work).
- Architecture: Next.js App Router, TypeScript strict, Tailwind v4 via PostCSS, `@/*` path alias, Vercel deployment.
- Source Layout: `src/app/` (pages/layouts/routes), `src/components/` (UI primitives), `src/lib/` (`resend.ts` factory + `email.ts` `parseRecipients` + `utils.ts`), `src/test/`, `docs/plans/`, `docs/solutions/`.
- Tech Stack: Resend library retained but not wired. No storage, no LLM, no cron in the tree today.
- Active Work: bullet list of issues #64, #65, #66, #67, #68, #69, #70 with one-line descriptions. Agents touching this repo should treat those as the source of truth for where new code goes.
- Environment Variables: point to `.env.example`; note that `RESEND_*` keys are already present and the rest land with the features that consume them.
- Remove: Supabase/SQLite/Gemini/cron references; `/api/generate-plan` and `/api/plan/current` mentions; `src/lib/storage/` and `src/types/` bullets (neither exists); "zero config (SQLite + demo data)" line.

Both docs should be generic — no personal emails, deployment URLs, or PII (per the keep-public-repo-generic learning).

**Patterns to follow:**
- Current minimal `.env.example` as the model for "tell the truth, defer the rest."
- `src/app/page.tsx`'s current terse "refactor in progress" framing as the tonal baseline.

**Test scenarios:**
- Test expectation: none — docs-only change. Verification is manual plus grep.

**Verification:**
- `grep -iE "supabase|gemini|@google/genai|better-sqlite3|sqlite|CRON_SECRET|nanoclaw|/api/generate-plan|/api/plan/current|DIETARY_PREFERENCES" README.md CLAUDE.md` returns nothing.
- `grep -E "docs/api\.md|docs/nanoclaw-setup\.md" README.md CLAUDE.md` returns nothing.
- Running each command in the Commands section succeeds against the current tree: `npm run dev` boots, `npm run build` succeeds, `npm run lint` clean, `npm test` green.
- `README.md` Getting Started steps can be followed end-to-end without referencing env vars that are not in `.env.example`.

---

## System-Wide Impact

- **Interaction graph:** No runtime code paths change other than the removal of an unused `getResend` import. `src/lib/resend.ts` has zero live callers in the tree after U1 — acceptable and intentional (it is pre-positioned for #70).
- **Error propagation:** One latent error path is removed (`sendMealPlanEmail` throwing on call). No new error paths introduced.
- **State lifecycle risks:** None — no persistent state touched.
- **API surface parity:** `sendMealPlanEmail` is removed from `src/lib/email.ts`'s public surface. There are no in-repo callers (verified via grep) and no external consumers (this is a Next.js app, not a library).
- **Integration coverage:** None needed; no behavioral change.
- **Unchanged invariants:** `parseRecipients` contract and tests; `getResend` contract in `src/lib/resend.ts`; `.env.example` contents; `src/app/page.tsx` and `src/app/layout.tsx`; all Cypress and Vitest configuration; `docs/design-system.md`; `docs/solutions/`; all existing plan and brainstorm files.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Rewriting `CLAUDE.md` changes how future agent sessions behave in this repo. If the new version is too thin, agents lose useful context; too thick, it drifts. | Keep it short and truthful; point at `.env.example` and open issues for the rest. Future feature PRs extend `CLAUDE.md` as they land, same pattern as `.env.example`. |
| Deleting `docs/api.md` without a replacement could surprise NanoClaw users or other external consumers. | The endpoints `docs/api.md` described were deleted in #63 and already return 404. The doc is already wrong, not load-bearing. NanoClaw integration is explicitly not in the #64–#70 plan. |
| `getResend` becomes unreferenced after U1, which could be flagged during later refactors as dead code and deleted prematurely. | `src/lib/resend.ts` will be re-entered by #70 within weeks. If that slips, the next refactor pass can re-evaluate; the file is ~13 lines and trivial to re-add. Not worth adding a marker comment for. |
| Future agent sessions load the old `CLAUDE.md` from cache before the new one is committed and merged. | Single-PR turnaround minimizes the window. Once merged, next session in this repo reads the fresh file. |

---

## Documentation / Operational Notes

- This plan itself is a docs-and-hygiene PR. There is nothing to roll out, monitor, or feature-flag.
- Suggested PR title: `refactor: remove post-strip residuals (stale docs + email stub)`.
- Suggested PR body: summarize the two categories, link to #63 as the upstream strip PR, link to #64 as the next feature PR this clears the runway for, note that `src/lib/resend.ts` is intentionally retained.

---

## Sources & References

- **Upstream PR (origin context):** [#63 — refactor: strip Supabase, Gemini, SQLite, and cron workflow](https://github.com/dancj/meal-assistant/pull/63), merged commit `c09d170`.
- **Next feature issue:** [#64 — GitHub recipe reader: /api/recipes backed by private repo markdown](https://github.com/dancj/meal-assistant/issues/64).
- **Prior plan:** `docs/plans/2026-04-22-001-refactor-strip-old-stack-plan.md` — defines what was removed and what was intentionally retained (Resend library, `src/lib/email.{ts,test.ts}`, Cypress).
- **Related open issues (roadmap for the new stack):** #65 (deals), #66 (generator), #67 (UI), #68 (logging), #69 (pantry), #70 (email).
- **Affected code paths:** `src/lib/email.ts`, `src/lib/email.test.ts`, `src/lib/resend.ts` (unchanged but context-relevant).
- **Affected docs:** `README.md`, `CLAUDE.md`, `docs/api.md` (deleted), `docs/nanoclaw-setup.md` (deleted).
