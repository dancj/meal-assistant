---
title: "feat: Optional email button — POST /api/email gated on RESEND_API_KEY"
type: feat
status: active
date: 2026-04-26
---

# feat: Optional email button — POST /api/email gated on RESEND_API_KEY

## Overview

Issue #70 closes the meal-assistant rebuild by adding an optional "Email me this" surface to the plan page (#67). The email path is no longer cron-driven or coupled to plan generation (the old `#3+resend` flow was stripped in #63). It becomes a one-shot, on-demand action: the user clicks a button, the in-memory `MealPlan` is POSTed to a new `POST /api/email` route, and Resend delivers the formatted plan to the configured recipients. With no `RESEND_API_KEY` configured, the button is hidden and the rest of the app keeps working unchanged.

The infrastructure is already partly in place: `resend@6.12.2` is a dependency, `src/lib/resend.ts` exposes a lazy `getResend()`, and `src/lib/email.ts` already implements `parseRecipients(EMAIL_RECIPIENTS)`. This PR adds the missing pieces: an HTML/text formatter for the new `MealPlan` shape, a sender, the route, the button component, the server-side gating wire-up, and demo-mode parity.

---

## Problem Frame

The original architecture (Supabase + Gemini + GitHub Actions cron) treated email as the primary delivery channel: the cron job generated a plan and emailed it in one go. After the strip in #63 the app is single-page and on-demand — the user generates plans interactively in the browser. Email is now optional polish: useful for archiving the week's plan in a phone inbox or sharing with a partner, but not load-bearing.

The issue is explicit that email must be fully optional:

- App must be fully functional without `RESEND_API_KEY` set.
- Without Resend the button is hidden — clicking nothing is impossible.
- No build errors when Resend env vars are absent.

The only observable behavior change in the no-Resend case must be the absence of the button.

---

## Requirements Trace

- R1. `POST /api/email` accepts a `MealPlan` JSON body, formats it as an HTML + plain-text email, and sends it via Resend to the recipients in `EMAIL_RECIPIENTS` from `EMAIL_FROM`.
- R2. With `RESEND_API_KEY` set, the page renders an "Email me this" button that POSTs the in-memory plan (no regeneration) and surfaces success or failure as a toast.
- R3. With `RESEND_API_KEY` unset, the button is not rendered, and `npm run build` succeeds with no Resend env vars present.
- R4. The route validates the `MealPlan` body shape and rejects malformed input with 400.
- R5. The route returns 500 when Resend env vars are missing (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_RECIPIENTS`), 502 when Resend rejects (return-value error or thrown network error), 200 with the Resend `id` on success.
- R6. `DEMO_MODE=1` short-circuits `POST /api/email` to a fake-success response (with `X-Demo-Mode: 1`) and forces the button to render regardless of `RESEND_API_KEY`, so the demo surface is exercisable without real credentials.
- R7. The HTML email is mobile-friendly (single-column, inline styles, max-width ~600px) and renders the 5 meal cards (title, optional kid version, deal matches) plus the grocery list grouped by store. A plain-text fallback exists.
- R8. Dynamic content (recipe names, grocery items, brand strings) is HTML-escaped before injection into the template — `& < > " '` become entities.
- R9. The email subject includes the current week (e.g., "Your meal plan — Apr 27, 2026"). `MealPlan` carries no `weekOf`, so the route stamps the current week at request time using the same `currentWeekStart()` helper the page already uses for thumb logging.
- R10. None of the new code's error messages interpolate `RESEND_API_KEY` or any Resend value.

---

## Scope Boundaries

- No `GET /api/email` (history, status, or test-send). Send-only.
- No idempotency key on the Resend call. Accepting a small risk of duplicate sends on retry; can be added later via Resend's `idempotencyKey` if it becomes a problem.
- No retries on the server side. A failed send returns 502 and the user clicks again.
- No persistence of sent emails (no log file in the recipes repo; no DB row). The user has the email itself in their inbox as the record.
- No React Email or templating library. Plain template strings with inline CSS, matching the prior #3 approach.
- No "send to a different recipient" UI. Recipients come from `EMAIL_RECIPIENTS` only.
- No editing the plan in the email body. The button sends the in-memory plan verbatim — no regeneration, no selection.
- No automatic scheduled sends. Cron-based delivery is explicitly out (it was the old stack and is not coming back).
- No PDF attachment. HTML body only.
- No image generation (e.g., per-meal photos). Text-only recipe titles.

---

## Context & Research

### Relevant Code and Patterns

- `src/app/api/generate-plan/route.ts` — closest precedent for a `POST` route in the new stack: JSON body, `validateInput`, demo-mode short-circuit before the external call, typed error fan-out (`MissingEnvVarError → 500`, upstream errors → 502, malformed input → 400). The email route follows this skeleton.
- `src/app/api/pantry/route.ts` — small `GET` route with the same demo-mode short-circuit + error fan-out shape; useful as a structural reference for how thin route handlers should be.
- `src/lib/plan/generate.ts` and `src/lib/plan/errors.ts` — the typed-error pattern (`MissingEnvVarError`, upstream-error class with optional status). The email module mirrors this structure.
- `src/lib/plan/validate.ts:validateMealPlan(rawText: string)` — currently parses an LLM-text-returned `MealPlan`. The shape-validation logic is already there; small refactor to expose an `assertMealPlan(value: unknown): MealPlan` helper for the new route to share without re-stringifying.
- `src/lib/resend.ts` — lazy `getResend()` that reads `RESEND_API_KEY` at first use. Reused as-is.
- `src/lib/email.ts:parseRecipients` — already implemented and tested. Reused as-is.
- `src/lib/api/client.ts` — typed `getJson` / `postJson` wrappers and `ApiError`. Adding `sendEmail(plan: MealPlan): Promise<{ id: string }>` follows the existing shape.
- `src/lib/plan-ui/use-plan-state.ts` — the page's state hook. The `ready` branch already has the in-memory `plan`; the email button reads from there. No state-machine changes needed.
- `src/lib/plan-ui/week.ts:currentWeekStart()` — already used for thumb logging; reused for the email subject's week label so server and client stay aligned.
- `src/components/grocery-list.tsx` and `src/components/meal-card.tsx` — reference for how stores and meals are labeled in the UI; used to keep email copy and on-screen copy consistent.
- `src/lib/demo/fixtures.ts` — `isDemoMode()` and existing `DEMO_*` patterns. The email route's demo short-circuit follows the `DEMO_MODE=1 → fake response + X-Demo-Mode: 1` convention.
- `src/app/api/demo-mode.test.ts` — single suite asserting all demo-mode routes set the header and skip external calls. Email route gets a new `describe` block here.
- `src/app/page.tsx` — currently a top-level `"use client"` page. To do the server-side gating without a config endpoint, this file becomes a thin server component that reads `process.env.RESEND_API_KEY` (or detects demo mode) and passes `emailEnabled: boolean` to a moved client component.

### Institutional Learnings

- `docs/solutions/build-errors/shadcn-generated-files-not-committed-2026-04-04.md` — not directly applicable; flagged for awareness only.
- The `MealLog` and `Pantry` shape changes in #68 / #69 are the freshest precedent for breaking a `GeneratePlanInput`-style boundary cleanly. This PR does not touch `GeneratePlanInput`; the email route consumes `MealPlan` (the output, not the input), so blast radius is smaller.
- The previous email implementation (`docs/plans/2026-02-23-feat-resend-meal-plan-email-delivery-plan.md`, status `completed` then stripped in #63) wired email into the generate-plan route directly. This PR explicitly breaks that coupling — email is its own route and its own button, gated independently.

### External References

- Resend Node SDK: <https://resend.com/docs/sdks/node>. Key behavior: `emails.send()` returns `{ data, error }` for API errors (does NOT throw), and throws on network failures. Both modes must be handled.
- Resend free tier: sending domain `onboarding@resend.dev` only delivers to the account-owner address. Custom domains needed for other recipients (operational note, not a code constraint).

---

## Key Technical Decisions

- **Server component split for gating, not a config endpoint.** The issue offers either approach; a server component is one fewer round trip, idiomatic Next.js App Router, and keeps the secret check on the server. `src/app/page.tsx` becomes a tiny server component that reads env and passes `emailEnabled` to a moved client component (`src/components/home-page.tsx`). Trade-off: requires moving `"use client"` down one file. Acceptable cost for cleaner data flow and no extra fetch on mount.
- **Env vars: keep `EMAIL_FROM` and `EMAIL_RECIPIENTS`.** The issue body uses `EMAIL_TO`, but `.env.example` and the existing `parseRecipients` helper already use `EMAIL_RECIPIENTS` (comma-separated multi-recipient) and `EMAIL_FROM` (sender address). The existing names are richer (multi-recipient out of the box), already documented, and already tested. Treat the issue's `EMAIL_TO` as loose phrasing and prefer the in-tree names. Documented as a planning decision in this plan and in `.env.example`.
- **Gate visibility on `RESEND_API_KEY` only.** The issue says "Only rendered when `RESEND_API_KEY` is set". Don't also check `EMAIL_FROM` / `EMAIL_RECIPIENTS` for visibility — if those are misconfigured, the button is rendered, the click 500s, and the toast surfaces a clear "EMAIL_FROM environment variable is required" message. Misconfigured env vars are operator errors and should be loud, not silent.
- **`assertMealPlan(value: unknown): MealPlan` helper extracted from `validateMealPlan`.** The current `validateMealPlan(rawText: string)` strips code fences and JSON-parses before shape-checking. Extract the shape-checking half into `assertMealPlan(value: unknown): MealPlan` and have `validateMealPlan` call it. The email route then calls `assertMealPlan(parsedBody)` directly — no double-stringify, no re-parse. Keeps validation logic in one place and tested in one suite.
- **Demo mode shows the button.** `DEMO_MODE=1` is a "make every surface clickable without real creds" mode. The email button is gated by `emailEnabled`, which the server component computes as `process.env.RESEND_API_KEY != null || isDemoMode()`. Clicks in demo mode hit the route's demo short-circuit and return `{ ok: true, id: "demo-email-id" }` without touching Resend.
- **Subject-line week from `currentWeekStart()`, server-side.** The route imports `currentWeekStart` from `src/lib/plan-ui/week.ts` and stamps the subject `"Your meal plan — ${formatted}"` at request time. Avoids relying on client clock and keeps the page payload smaller (no `weekOf` in the body).
- **Plain template strings with inline CSS.** No React Email; email clients strip `<style>` tags inconsistently. Inline `style="..."` attributes only. Mobile-friendly: single-column layout, max-width 600px, system font stack.
- **HTML escape every dynamic field.** A small private `escapeHtml(s)` function inside the formatter. Recipe titles, kid versions, deal-match strings, grocery items, quantities, brand text — all routed through it. Prevents broken rendering and downstream injection from a hostile recipes repo.
- **Resend errors mapped to a typed `ResendUpstreamError`.** New file `src/lib/email/errors.ts` defines `ResendUpstreamError` and re-exports `MissingEnvVarError` from the email module. Mirrors the `AnthropicUpstreamError` pattern from `src/lib/plan/errors.ts`.
- **Route never logs the recipient list.** `console.log` on success records the Resend message ID only; not the email body, not `EMAIL_RECIPIENTS`. Keeps Vercel logs free of household contact info.
- **No queueing or retry on the server.** Send synchronously. If it fails, return 502 — the user clicks again.
- **`sendEmail` lives on `src/lib/api/client.ts` next to the other typed wrappers.** Returns `{ id: string }` (the Resend message id) so the toast can include "id: …" if desired.

---

## Open Questions

### Resolved During Planning

- Server-side gating mechanism: server component split, not a config endpoint.
- Env var names: keep `EMAIL_FROM` + `EMAIL_RECIPIENTS`; ignore the issue body's `EMAIL_TO` wording.
- Visibility gate: `RESEND_API_KEY` only (not `EMAIL_FROM` / `EMAIL_RECIPIENTS`).
- Demo-mode button visibility: visible (button gated on `RESEND_API_KEY || DEMO_MODE`).
- Subject line: includes `currentWeekStart()` formatted as a human date.
- Email template engine: plain template strings, inline CSS, no React Email.
- HTML escaping: yes, every dynamic field.
- Validator sharing: extract `assertMealPlan(value: unknown)` from `validateMealPlan(rawText)` rather than re-stringifying in the route.
- Idempotency: not in this PR.

### Deferred to Implementation

- Exact subject-line wording. "Your meal plan — Apr 27, 2026" is a starting point; the implementer can iterate on copy after seeing a real send.
- Whether the email body should include the deal-match annotations on each meal card or only on the grocery list. Default plan: show on both, since the email is the artifact the user looks at when shopping. Adjust if it looks cluttered in real renders.
- Whether to surface the Resend message id in the success toast (`Email sent (id: re_…)`) or just `Email sent`. Default: include the id, since it's useful for triage. Trim if it looks noisy.
- Custom-domain story for `EMAIL_FROM`. The free Resend tier (`onboarding@resend.dev`) only delivers to the account owner. Documented in the operational notes; no code change needed.
- Whether to also escape the few non-dynamic strings in the template (the constant header copy). Default: no — they are author-controlled. Reconsider only if the template starts pulling from data.

---

## Implementation Units

- U1. **Validator refactor: extract `assertMealPlan(value: unknown)`**

**Goal:** Split the existing `validateMealPlan(rawText: string)` so the shape-checking half is reusable from a non-LLM caller without re-stringifying.

**Requirements:** R4.

**Dependencies:** None.

**Files:**
- Modify: `src/lib/plan/validate.ts`
- Modify: `src/lib/plan/validate.test.ts`

**Approach:**
- Introduce `export function assertMealPlan(value: unknown): MealPlan` containing everything `validateMealPlan` currently does after `JSON.parse` (the `meals.length === 5` check, the per-meal validation, the grocery-list validation).
- `validateMealPlan(rawText: string)` becomes: strip fences → `JSON.parse` → `assertMealPlan(parsed)`.
- No behavior change for the existing LLM caller. New caller (the email route, U3) imports `assertMealPlan` directly.

**Execution note:** Test-first per `.claude/skills/meal-assistant/tdd-vitest/SKILL.md`. Confirm the existing `validate.test.ts` suite stays green after the refactor before adding new cases for `assertMealPlan`.

**Patterns to follow:**
- The existing private helpers (`validateMeal`, `validateGroceryItem`) and the `MalformedPlanError` shape in `src/lib/plan/validate.ts`.

**Test scenarios:**
- Happy path: `assertMealPlan(<valid plan object>)` returns the typed `MealPlan` unchanged.
- Edge case: `assertMealPlan` accepts the same valid input that `validateMealPlan(JSON.stringify(...))` accepts, end-to-end.
- Error path: `assertMealPlan(null)` → `MalformedPlanError` at `<root>`.
- Error path: `assertMealPlan({ meals: [] })` → `MalformedPlanError` at `meals` with "expected 5 meals, got 0".
- Error path: `assertMealPlan({ meals: [...4 meals...], groceryList: [] })` → `MalformedPlanError` at `meals`.
- Error path: `assertMealPlan({ meals: [...5 invalid meals...], groceryList: [] })` → `MalformedPlanError` at `meals[0]....`.
- Regression: `validateMealPlan('```json\n{...}\n```')` (the existing LLM-fenced shape) still works after the refactor.

**Verification:**
- `npm run test -- src/lib/plan/validate.test.ts` passes with the existing suite untouched plus the new `assertMealPlan` cases.
- `validateMealPlan` is now a 3-line wrapper around `assertMealPlan`.

---

- U2. **Email module: errors, formatter, sender**

**Goal:** Implement the pure HTML/text formatter and the Resend sender, with a typed error class.

**Requirements:** R1, R5, R7, R8, R9, R10.

**Dependencies:** None (uses existing `src/lib/resend.ts`, `src/lib/email.ts:parseRecipients`).

**Files:**
- Create: `src/lib/email/errors.ts`
- Create: `src/lib/email/format.ts`
- Create: `src/lib/email/format.test.ts`
- Create: `src/lib/email/send.ts`
- Create: `src/lib/email/send.test.ts`

**Approach:**
- `src/lib/email/errors.ts` defines `ResendUpstreamError` (carries the Resend message string and an optional `name` from the Resend error envelope). Re-exports `MissingEnvVarError` from `@/lib/plan/errors` so the email route can fan-out symmetrically.
- `src/lib/email/format.ts:formatMealPlanEmail(plan: MealPlan, weekStart: string): { subject: string; html: string; text: string }`:
  - Subject: `"Your meal plan — ${humanDate(weekStart)}"` via `Intl.DateTimeFormat("en-US", { dateStyle: "long" })`.
  - HTML: single-column inline-styled layout. Sections: header, 5 meal cards (title, optional `kidVersion` line, optional bullet list of `dealMatches`), grocery list grouped by store using `STORES` order from `@/lib/plan/types` and `STORE_LABELS` mirroring `src/components/grocery-list.tsx`.
  - Text: plain-text equivalent. Same sections, line breaks instead of HTML.
  - Private `escapeHtml(s: string)` replaces `& < > " '` with entities. Applied to every dynamic insertion.
- `src/lib/email/send.ts:sendMealPlanEmail(plan: MealPlan, weekStart: string): Promise<{ id: string }>`:
  - Reads `EMAIL_FROM` (throws `MissingEnvVarError("EMAIL_FROM")` if absent or empty).
  - Reads `EMAIL_RECIPIENTS` via `parseRecipients` (throws `MissingEnvVarError("EMAIL_RECIPIENTS")` if absent).
  - `getResend()` (throws `MissingEnvVarError("RESEND_API_KEY")` if absent).
  - Calls `formatMealPlanEmail(plan, weekStart)` to build subject/html/text.
  - Calls `client.emails.send({ from, to, subject, html, text })`.
  - If Resend returns `{ data: null, error: {...} }` → throws `ResendUpstreamError(error.message, error.name)`.
  - If Resend throws (network) → wraps in `ResendUpstreamError`.
  - On success returns `{ id: data.id }`.
- No log of `to` addresses on success or failure — only the Resend id and error name.

**Execution note:** Test-first. Format first, then sender (sender depends on format). Mock `@/lib/resend` to inject a fake Resend client.

**Patterns to follow:**
- `src/lib/plan/errors.ts` for the typed-error class shape.
- `src/lib/plan/generate.ts` for the upstream-error mapping pattern (return-value error vs thrown).
- `src/components/grocery-list.tsx` for `STORE_LABELS` and store-grouping logic — the email layout should match the on-screen grouping.
- `src/lib/email.ts` for the existing `parseRecipients` helper (re-used, not modified).

**Test scenarios:** *(formatter)*
- Happy path: `formatMealPlanEmail(DEMO_PLAN, "2026-04-27")` returns `{ subject, html, text }` where the subject contains "April 27, 2026".
- Happy path: HTML contains every meal title from the plan.
- Happy path: HTML contains every grocery item from the plan, grouped by store, in the canonical store order (`aldi, safeway, costco, wegmans`).
- Happy path: `kidVersion` is rendered when non-null and omitted when null.
- Happy path: `dealMatches` are rendered when non-empty and omitted when empty.
- Happy path: text version contains every meal title and grocery item, with no `<` or `>` characters.
- Edge case: meal title with `<script>alert(1)</script>` is HTML-escaped (`&lt;script&gt;`).
- Edge case: grocery item with `Tom's "Best" & Co.` quotes/ampersands are escaped to `&quot;`, `&amp;`, `&#39;`.
- Edge case: empty `groceryList` array renders an empty list section without crashing.
- Edge case: subject's date formatter produces a human-readable string (`"April 27, 2026"`) regardless of system locale; the implementer can `it.each` over a couple of `weekStart` inputs.
- Edge case: HTML is wrapped in `<table>`-based mobile layout (or equivalent inline-styled div) with `max-width: 600px`. Assert the string contains `max-width:600px` (or `max-width: 600px`).

**Test scenarios:** *(sender)*
- Happy path: with all env vars set and Resend mocked to return `{ data: { id: "re_abc123" }, error: null }`, `sendMealPlanEmail(plan, week)` resolves to `{ id: "re_abc123" }` and calls `emails.send` with the formatted `{ from, to, subject, html, text }`.
- Happy path: `to` is the parsed array from `EMAIL_RECIPIENTS` (multi-recipient).
- Error path: `RESEND_API_KEY` unset → `MissingEnvVarError("RESEND_API_KEY")`; Resend client never instantiated.
- Error path: `EMAIL_FROM` unset → `MissingEnvVarError("EMAIL_FROM")`.
- Error path: `EMAIL_RECIPIENTS` unset → `MissingEnvVarError("EMAIL_RECIPIENTS")`.
- Error path: Resend returns `{ data: null, error: { message: "domain unverified", name: "validation_error" } }` → throws `ResendUpstreamError` with the message and name.
- Error path: Resend throws `new Error("ECONNRESET")` → throws `ResendUpstreamError` with the network error wrapped.
- Edge case: `console.log` on success contains the Resend id but does NOT contain `RESEND_API_KEY`, `EMAIL_FROM`, or any recipient address.
- Edge case: thrown errors do NOT contain `RESEND_API_KEY` value.

**Verification:**
- `npm run test -- src/lib/email/` passes.
- Modules are pure / side-effect-free at import time (no `getResend()` at module scope).

---

- U3. **`POST /api/email` route**

**Goal:** Thin route that validates input, demo-short-circuits, sends, and fans errors to status codes.

**Requirements:** R1, R4, R5, R6, R10.

**Dependencies:** U1, U2.

**Files:**
- Create: `src/app/api/email/route.ts`
- Create: `src/app/api/email/route.test.ts`
- Modify: `src/app/api/demo-mode.test.ts` (add a `POST /api/email` describe)

**Approach:**
- `export const runtime = "nodejs"`. `export const maxDuration = 30` (Resend sends are fast — ~200ms — but allow generous headroom).
- `export async function POST(request: Request): Promise<Response>`:
  1. Parse JSON body. Invalid JSON → 400 `{ error: "Request body must be valid JSON" }`.
  2. `assertMealPlan(body)` (from U1). On `MalformedPlanError` → 400 `{ error: err.message, path: err.path }`.
  3. If `isDemoMode()` → return 200 `{ ok: true, id: "demo-email-id" }` with header `X-Demo-Mode: 1`. No Resend call.
  4. Compute `weekStart = currentWeekStart()` (from `src/lib/plan-ui/week.ts`).
  5. `await sendMealPlanEmail(plan, weekStart)` → 200 `{ ok: true, id }`.
  6. Error fan-out:
     - `MissingEnvVarError` → 500 with the (env-var-name only) message.
     - `ResendUpstreamError` → 502 with `{ error: "Resend upstream error", detail: err.message }`.
     - Anything else → 500 `{ error: "Unexpected error" }` + `console.error`.
- Never interpolate any env var value into the response body or thrown error; only env-var names are exposed.

**Execution note:** Test-first; route handler tests follow `src/app/api/pantry/route.test.ts` (mocks the lib/email module symmetric to the pantry github mock).

**Patterns to follow:**
- `src/app/api/generate-plan/route.ts` for the validate-then-demo-then-call shape with typed-error fan-out.
- `src/app/api/pantry/route.ts` for the demo-short-circuit + `X-Demo-Mode` header.
- `src/app/api/log/route.ts` for the demo-mode test pattern (mock the underlying lib, set/unset `process.env.DEMO_MODE`).

**Test scenarios:**
- Happy path: with `sendMealPlanEmail` mocked to return `{ id: "re_abc123" }`, `POST /api/email` with a valid plan → 200, body `{ ok: true, id: "re_abc123" }`.
- Happy path: `DEMO_MODE=1` → 200, body `{ ok: true, id: "demo-email-id" }`, header `X-Demo-Mode: 1`, `sendMealPlanEmail` not called.
- Error path: invalid JSON body → 400.
- Error path: empty body `{}` → 400 `MalformedPlanError` at `meals`.
- Error path: body with 4 meals → 400 with `path: "meals"`.
- Error path: sender throws `MissingEnvVarError("RESEND_API_KEY")` → 500 with the var name in the message.
- Error path: sender throws `MissingEnvVarError("EMAIL_FROM")` → 500.
- Error path: sender throws `ResendUpstreamError("domain unverified")` → 502 with `detail: "domain unverified"`.
- Error path: sender throws an unexpected error → 500 `{ error: "Unexpected error" }`.
- Edge case: response body never contains `RESEND_API_KEY`, `EMAIL_FROM`, or any recipient address (assert against the JSON of every error response in this suite).
- Demo-mode parity: extends `src/app/api/demo-mode.test.ts` with a `POST /api/email (demo mode)` describe asserting `X-Demo-Mode: 1`, no Resend call, body `{ ok: true, id: "demo-email-id" }`.

**Verification:**
- `npm run test -- src/app/api/email/` passes with the sender mocked.
- `npm run test -- src/app/api/demo-mode.test.ts` passes including the new email block.

---

- U4. **Page split: server component + client component, exposing `emailEnabled`**

**Goal:** Convert `src/app/page.tsx` to a thin server component that reads env and forwards `emailEnabled` to the moved client UI.

**Requirements:** R3, R6.

**Dependencies:** None (independent; can land before or after U3).

**Files:**
- Modify: `src/app/page.tsx` (server component shell)
- Create: `src/components/home-page.tsx` (the moved client UI; `"use client"`)
- Modify: `src/app/page.test.tsx` (now exercises `<HomePage />` directly)

**Approach:**
- New `src/app/page.tsx` is a server component (no `"use client"` directive) that:
  - Computes `emailEnabled = (process.env.RESEND_API_KEY ?? "").length > 0 || isDemoMode()`.
  - Renders `<HomePage emailEnabled={emailEnabled} />`.
- New `src/components/home-page.tsx` carries the `"use client"` directive and the previous body of `src/app/page.tsx`. Adds an `emailEnabled: boolean` prop. The prop is forwarded to the email button (added in U5).
- Existing tests in `src/app/page.test.tsx` move to import `<HomePage />` from `@/components/home-page` and pass `emailEnabled={false}` by default. New `emailEnabled={true}` cases are added in U5.

**Execution note:** This is a structural move with no behavior change yet. Verify `npm run dev` still renders identically before adding the button in U5.

**Patterns to follow:**
- Next.js App Router server-component → client-component handoff is a vanilla pattern; no in-repo precedent yet, but the standard "server component reads env, renders client component with props" shape applies.

**Test scenarios:**
- Happy path: `<HomePage emailEnabled={false} />` renders the existing UI without an email button (negative assertion).
- Happy path: `<HomePage emailEnabled={true} />` renders the existing UI; button assertion lives in U5's tests but the prop must propagate cleanly here.
- Regression: every test from the old `src/app/page.test.tsx` continues to pass against `<HomePage emailEnabled={false} />`.

**Verification:**
- `npm run test -- src/app/page.test.tsx` and `npm run test -- src/components/` pass.
- `npm run build` passes with both `RESEND_API_KEY` set and unset (the env read happens at request time, not build time, so this should be straightforward).
- Visual check: `npm run dev` page renders identically before and after the split.

---

- U5. **`<EmailButton />` component + client API helper + UI wiring**

**Goal:** Add the user-visible button and the client wrapper that POSTs the in-memory plan.

**Requirements:** R2, R6, R7 (delivery surface).

**Dependencies:** U3 (route exists), U4 (page accepts `emailEnabled`).

**Files:**
- Create: `src/components/email-button.tsx`
- Create: `src/components/email-button.test.tsx`
- Modify: `src/lib/api/client.ts` (add `sendEmail`)
- Modify: `src/lib/api/client.test.ts`
- Modify: `src/components/home-page.tsx` (render `<EmailButton />` when `emailEnabled`)
- Modify: `src/app/page.test.tsx` (assert button presence/absence by `emailEnabled`)

**Approach:**
- `sendEmail(plan: MealPlan): Promise<{ ok: true; id: string }>` in `src/lib/api/client.ts` calls `postJson("/api/email", plan)`. Follows the same `ApiError`-throwing contract as the rest.
- `<EmailButton />` is a client component (`"use client"`). Props: `plan: MealPlan`, `disabled: boolean` (mirroring how the existing `Regenerate plan` button locks during `generating`).
- Internal local state: `sending: boolean`. On click: `setSending(true)` → `sendEmail(plan).then(({ id }) => toast.success("Email sent", { description: id ? \`id: \${id}\` : undefined })).catch(err => toast.error("Couldn't send email", { description: errorMessage(err) })).finally(() => setSending(false))`.
- Visual: an outline `Button` with a `Mail` icon (lucide-react), label "Email me this" (or "Sending…" while in flight). Sits next to the existing "Regenerate plan" button in the meals header row.
- In `src/components/home-page.tsx`, render the button only when `emailEnabled === true`. Pass `plan={plan}` and `disabled={generating}` from the existing `usePlanState` ready-state.

**Execution note:** Test-first. Use `vi.mock("sonner", ...)` and the existing `fetch` stubbing pattern from `src/components/*.test.tsx`.

**Patterns to follow:**
- `src/lib/api/client.ts:postMealLog` for the `sendEmail` shape.
- `src/components/meal-card.tsx` and `src/app/page.tsx` (current button row) for visual conventions: `Button` from `@/components/ui/button`, lucide icon + label, `aria-label` on icon-leading buttons.
- `src/lib/plan-ui/use-plan-state.ts:logCurrentSnapshot` for the toast-on-failure pattern.

**Test scenarios:** *(client wrapper)*
- Happy path: `sendEmail(plan)` POSTs to `/api/email` with the plan as the JSON body and returns `{ ok: true, id }`.
- Error path: non-2xx → `ApiError("/api/email", 502, "...")`.
- Error path: network failure → `ApiError("/api/email", undefined, "network error: ...")`.

**Test scenarios:** *(button component)*
- Happy path: rendered with a valid plan; click POSTs the plan and shows a success toast with the returned id.
- Happy path: button label changes to "Sending…" while the promise is in flight; reverts on settle.
- Edge case: `disabled={true}` prevents click and visually disables.
- Edge case: re-clicking while in flight is a no-op (button is locally disabled or the click handler guards on `sending`).
- Error path: `sendEmail` rejects with `ApiError` → error toast surfaces the upstream message; button re-enables.
- Edge case: rapid double-click results in exactly one POST.

**Test scenarios:** *(page integration)*
- Happy path: `<HomePage emailEnabled={true} />` (with all four mount fetches mocked + `generatePlan` mocked) renders the button; clicking it triggers `sendEmail` with the current plan.
- Happy path: `<HomePage emailEnabled={false} />` renders no button (negative assertion: `queryByRole("button", { name: /email me this/i })` is null).
- Edge case: button is disabled while `generating` is true (during regenerate/swap).

**Verification:**
- `npm run test -- src/components/email-button.test.tsx` passes.
- `npm run test -- src/lib/api/client.test.ts` passes.
- `npm run test -- src/app/page.test.tsx` passes for both `emailEnabled={true}` and `emailEnabled={false}`.
- Visual check in `npm run dev`:
  - With `RESEND_API_KEY` set: button visible; click sends a real email and toast surfaces the Resend id.
  - With `DEMO_MODE=1`: button visible; click returns the demo id and toast says "Email sent".
  - Without `RESEND_API_KEY`: button hidden; rest of the page works.

---

- U6. **Env example + CLAUDE.md docs + Cypress smoke**

**Goal:** Document the new surface and add a minimal Cypress check for the demo-mode happy path.

**Requirements:** R3, R6.

**Dependencies:** U5.

**Files:**
- Modify: `.env.example` (clarify that `RESEND_API_KEY` activates the email button; note `EMAIL_FROM` and `EMAIL_RECIPIENTS` are required when Resend is enabled)
- Modify: `CLAUDE.md` (move #70 from "Optional `/api/email` via Resend, gated on `RESEND_API_KEY`" to "**Implemented**", add `src/lib/email/` to Source Layout, document `RESEND_API_KEY` / `EMAIL_FROM` / `EMAIL_RECIPIENTS` in Environment Variables)
- Modify: `cypress/e2e/` (add a single demo-mode smoke that loads the page and asserts the email button is visible — full send is skipped because Resend isn't reachable in CI)

**Approach:**
- `.env.example` already has the three vars; add a one-line comment near them: `# When set, enables the "Email me this" button on the plan page (#70).` Tie `EMAIL_FROM` to "required when RESEND_API_KEY is set" and `EMAIL_RECIPIENTS` to "required when RESEND_API_KEY is set, comma-separated".
- `CLAUDE.md` Active Work entry for #70 → **Implemented**, with bullets:
  - "`POST /api/email` formats the in-memory `MealPlan` as inline-styled HTML + plain text and sends via Resend to `EMAIL_RECIPIENTS` from `EMAIL_FROM`."
  - "Email module lives in `src/lib/email/` (formatter + sender + errors)."
  - "Page is now a server component (`src/app/page.tsx`) that reads `RESEND_API_KEY` and forwards `emailEnabled` to `src/components/home-page.tsx` (client). Button hidden when unset, visible (with no real send) when `DEMO_MODE=1`."
  - "Validator helper `assertMealPlan(value: unknown)` extracted from `validateMealPlan(rawText)` so the route shares shape-checking with the LLM path."
- Cypress smoke: a single `it("renders the email button in demo mode")` against the dev server with `DEMO_MODE=1`. Asserts the button text is visible. Does not click — clicking would hit the demo route and toast, which is also a valid extension if the helper is straightforward.

**Execution note:** No TDD on docs. The Cypress smoke follows `meal-assistant:tdd-cypress` if added.

**Patterns to follow:**
- Existing CLAUDE.md "Implemented" entries for #64–#69 for tone and structure.
- Existing `cypress/e2e/*.cy.ts` for the page-load smoke pattern.

**Test scenarios:**
- Test expectation: none for `.env.example` and `CLAUDE.md` (documentation, no behavior).
- Cypress: page loads under `DEMO_MODE=1` → "Email me this" button is visible.

**Verification:**
- `npm run lint` and `npm run build` clean.
- `npm run cypress:run` passes including the new smoke.
- `CLAUDE.md` references match what shipped.

---

## System-Wide Impact

- **Interaction graph:** New `POST /api/email` route. New `<EmailButton />` client component. Page is split into a server shell + a client component (one-time structural move); the client component's state machine is unchanged.
- **Error propagation:** `/api/email` failures surface as toasts on the page; nothing else in the app depends on email succeeding. Validator failures (`MalformedPlanError`) surface as 400. `MissingEnvVarError` surfaces as 500. Resend upstream errors surface as 502. None of these affect plan generation, log writes, or pantry reads.
- **State lifecycle risks:** None. The button reads the in-memory plan from `usePlanState` at click time; no shared mutable state, no caching, no retries.
- **API surface parity:** `/api/recipes`, `/api/deals`, `/api/log`, `/api/pantry`, `/api/generate-plan`, and now `/api/email` all use the `nodejs` runtime, the demo-mode short-circuit + `X-Demo-Mode: 1` header convention, and the typed-error fan-out pattern. The new route is symmetric with what exists.
- **Integration coverage:** Page-level tests in `src/app/page.test.tsx` exercise the button visibility branch under both `emailEnabled` values. The route-level tests + sender tests + formatter tests cover the email path end-to-end with Resend mocked. The Cypress smoke covers the demo-mode UI integration.
- **Unchanged invariants:** `/api/generate-plan` does NOT send email (cleanly decoupled from #3's old behavior). `MealPlan`, `Recipe`, `Deal`, `MealLog`, and `Pantry` shapes are untouched. `GeneratePlanInput` is untouched. The state machine in `src/lib/plan-ui/state.ts` is untouched. `src/lib/resend.ts` and `src/lib/email.ts:parseRecipients` are untouched.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Splitting `src/app/page.tsx` into a server component + moved client component breaks an existing test or the dev-server render path. | U4 lands as a no-behavior structural move with the existing tests passing first; only after that does U5 add the button. Keeps blast radius small. |
| Resend's `{ data, error }` envelope and thrown-network-error duality is easy to mishandle. | U2's `sendMealPlanEmail` tests cover both modes explicitly. The `ResendUpstreamError` type carries enough detail for triage; the route maps to 502 in both cases. |
| Free-tier Resend (`onboarding@resend.dev`) only delivers to the Resend account-owner address — other recipients in `EMAIL_RECIPIENTS` are silently dropped. | Documented in CLAUDE.md operational notes. Custom domain is an operator concern, not a code change. The button surface is the same either way. |
| Hostile recipe titles or grocery items break the email layout or inject HTML. | Every dynamic field is routed through `escapeHtml`. Tested explicitly in U2 with a `<script>...</script>` payload. |
| `process.env.RESEND_API_KEY` being read in the server component leaks the value to the client bundle. | The server component reads the env var into a boolean and passes only the boolean. The variable name is not `NEXT_PUBLIC_*` — Next.js will not embed the value in the client bundle. The pattern is the standard idiom for server-side feature flags. Verified by inspecting the built bundle in U6's verification. |
| Vercel `nodejs` runtime cold-start adds latency to the first email send. | Acceptable. Send is a single user-initiated action; ~500ms cold start is invisible behind a button toast. |
| Demo-mode short-circuit accidentally short-circuits a real send (e.g., `DEMO_MODE=1` left set in production). | Same risk as every other demo-aware route. The existing `src/app/api/demo-mode.test.ts` will continue to flag it. Operationally, `DEMO_MODE` is a development-only env var. |
| Logs leak recipient addresses or the API key. | U2's `sendMealPlanEmail` and U3's route handler tests assert no env-var values appear in logs or response bodies (R10). |
| Email body inadvertently exposes deal-match details or recipe content from a private repo to a non-private inbox. | Out-of-scope for this PR — the recipient is the user's own configured `EMAIL_RECIPIENTS`. If a household chooses to share the inbox, that's a household decision. |

---

## Documentation / Operational Notes

- Update `CLAUDE.md` Active Work entry for #70 → **Implemented** (see U6 for full bullets).
- Update `CLAUDE.md` Source Layout to add `src/lib/email/` (formatter + sender + errors).
- Update `CLAUDE.md` Environment Variables: `RESEND_API_KEY` is the gate; `EMAIL_FROM` and `EMAIL_RECIPIENTS` are required when Resend is enabled. `EMAIL_RECIPIENTS` is comma-separated.
- `.env.example` already has the three vars — only the comments need a small clarification (see U6).
- Operational note about Resend free tier (sending domain `onboarding@resend.dev` only delivers to the account owner) goes in CLAUDE.md, not in code.
- No new Vercel env vars beyond the three already documented.
- After deployment, the operator sets `RESEND_API_KEY` in Vercel project env to activate the surface. Without it the app continues to work; the button is simply not rendered.

---

## Sources & References

- Issue: [#70 — Optional email button: /api/email via Resend, gated on RESEND_API_KEY](https://github.com/dancj/meal-assistant/issues/70)
- Existing scaffolding (kept after #63 strip): `src/lib/resend.ts`, `src/lib/email.ts`
- Prior precedent (now stripped): `docs/plans/2026-02-23-feat-resend-meal-plan-email-delivery-plan.md`
- Closest active plan in shape: `docs/plans/2026-04-26-003-feat-pantry-awareness-plan.md` (#69)
- Route pattern reference: `src/app/api/generate-plan/route.ts`, `src/app/api/pantry/route.ts`
- Validator pattern reference: `src/lib/plan/validate.ts`, `src/lib/plan/errors.ts`
- Demo-mode wiring reference: `src/lib/demo/fixtures.ts`, `src/app/api/demo-mode.test.ts`
- TDD discipline: `.claude/skills/meal-assistant/tdd-vitest/SKILL.md`, `.claude/skills/meal-assistant/tdd-cypress/SKILL.md` (per CLAUDE.md mandate)
- Resend SDK: <https://resend.com/docs/sdks/node>
- Resend pricing / free tier limits: <https://resend.com/pricing>
