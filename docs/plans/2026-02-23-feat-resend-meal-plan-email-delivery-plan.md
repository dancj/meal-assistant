---
title: "Set up Resend for meal plan email delivery"
type: feat
status: completed
date: 2026-02-23
origin: docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md
---

# Set up Resend for meal plan email delivery

## Overview

Integrate email delivery into the existing `POST /api/generate-plan` route so that after Gemini generates a meal plan, it is automatically formatted as a mobile-friendly HTML email and sent to configured recipients via Resend. This completes P0 Phase 3 (email delivery) of the core pipeline.

## Problem Statement / Motivation

The meal plan generation endpoint currently returns the plan in the JSON response body only. The core workflow described in the brainstorm requires the plan to be **delivered via email** to household members so they can reference it throughout the week without needing to visit the app. Email is the primary delivery mechanism — the web UI is secondary (see brainstorm: `docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md`).

## Proposed Solution

Integrate email sending directly into the `POST /api/generate-plan` route (no separate `/api/send-plan` endpoint). After Gemini returns and validates the plan, format it as HTML and send via Resend before returning the response.

### Key Design Decisions

1. **No separate endpoint** — email fires as part of plan generation, matching the single-trigger core workflow
2. **Graceful degradation on email failure** — return 200 with `emailSent: false` and the plan in the body (not 500, since the plan was generated successfully)
3. **Inline-styled HTML** — no React Email or templating library; plain template strings with inline CSS (email clients strip `<style>` tags)
4. **Plain-text fallback** — include a `text` version alongside `html` for accessibility
5. **Lazy init for Resend client** — refactor `src/lib/resend.ts` to use `getResend()` pattern matching `getSupabase()` and `getAI()` conventions

## Technical Considerations

- **Resend SDK error pattern**: `emails.send()` returns `{ data, error }` on API errors (does NOT throw). Network failures DO throw. Must handle both modes.
- **Resend free tier**: Sends from `onboarding@resend.dev` to account owner's email only. Custom domain needed for other household members. Document this constraint.
- **HTML escaping**: Recipe names and ingredients are user-entered — must escape `& < > " '` to prevent broken rendering.
- **Vercel timeout budget**: Route now has 3 sequential external calls (Supabase + Gemini + Resend). Current `maxDuration = 60` should be sufficient since Resend sends are fast (~200ms), but worth monitoring.
- **No idempotency for MVP**: Accept small risk of duplicate emails on retry. Can add Resend `idempotencyKey` in a future iteration.

## Acceptance Criteria

- [x]`src/lib/resend.ts` refactored to `getResend()` lazy init pattern
- [x]`src/lib/email.ts` created with `formatMealPlanEmail()` and `sendMealPlanEmail()` functions
- [x]HTML email renders 5 dinner cards (recipe name, day, servings, alternative note if present) + grocery list
- [x]Email uses inline CSS, is mobile-friendly, and includes a plain-text fallback
- [x]Dynamic content (recipe names, ingredients) is HTML-escaped
- [x]`EMAIL_RECIPIENTS` parsed correctly: split on comma, trim whitespace, filter empty strings
- [x]Missing/empty `EMAIL_RECIPIENTS` or `EMAIL_FROM` produces a clear error (not a crash)
- [x]Both Resend return-value errors and thrown exceptions are handled
- [x]Email failure returns 200 with `{ success: true, plan, emailSent: false, emailError: "..." }`
- [x]Email success returns 200 with `{ success: true, plan, emailSent: true }`
- [x]Resend email ID logged on successful send
- [x]`weekOf` date formatted as human-readable (e.g., "February 23, 2026") in subject and body
- [x]Tests for `formatMealPlanEmail` (pure function, snapshot-friendly)
- [x]Tests for `sendMealPlanEmail` (mock Resend, test success/failure/missing env vars)
- [x]Tests for `parseRecipients` utility
- [x]Route integration tests covering email success and failure paths
- [x]`sample.env.local` entries documented (already exist: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_RECIPIENTS`)

## Success Metrics

- Weekly cron trigger generates a plan AND delivers it via email in a single request
- Email arrives formatted and readable on mobile
- Email failures do not block plan delivery in the response body

## Dependencies & Risks

**Dependencies:**
- Issue #3 (Gemini meal plan generation) — **merged** ✅
- `resend` package v6.9.2 — **installed** ✅
- `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_RECIPIENTS` in `sample.env.local` — **defined** ✅

**Risks:**
- Resend free tier only delivers to account owner email — other household members won't receive emails until a custom domain is configured. Mitigate with clear documentation.
- No date formatting library installed — using `Intl.DateTimeFormat` (built-in, zero dependencies).

## Implementation Plan

### Phase 1: Refactor Resend client + create email utilities

**Files to modify:**
- `src/lib/resend.ts` — convert to lazy `getResend()` pattern

**Files to create:**
- `src/lib/email.ts` — email formatting and sending logic

#### `src/lib/resend.ts` changes

Convert from eager module-level init to lazy getter:

```typescript
// src/lib/resend.ts
import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResend(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}
```

#### `src/lib/email.ts` structure

Three exported functions:

1. **`parseRecipients(envVar: string | undefined): string[]`** — splits comma-separated string, trims, filters empties. Throws if result is empty array.

2. **`formatMealPlanEmail(plan: MealPlan): { html: string; text: string }`** — generates inline-styled HTML and plain-text version. Escapes all dynamic content.

3. **`sendMealPlanEmail(plan: MealPlan): Promise<{ emailId: string }>`** — reads `EMAIL_FROM` and `EMAIL_RECIPIENTS` from env, calls `getResend().emails.send()`, handles both return-value errors and thrown exceptions, returns Resend email ID.

#### HTML email template

Inline-styled HTML with:
- Header: "Your Meal Plan for the week of [formatted date]"
- 5 dinner cards: day name, recipe name, servings count
  - If `alternativeNote` is non-null: muted italic line below the card
- Grocery list: simple bulleted list of items with quantities
- Footer: "Generated by Meal Assistant"
- Mobile-friendly: single-column layout, max-width 600px, readable font sizes

#### HTML escaping utility

Private `escapeHtml(str: string): string` function replacing `& < > " '` with HTML entities.

#### Date formatting

Use `new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(plan.weekOf))` for display (e.g., "February 23, 2026").

### Phase 2: Wire email into generate-plan route

**Files to modify:**
- `src/app/api/generate-plan/route.ts`

After the existing plan validation step (around line 249), add:

```typescript
// Attempt to send email
let emailSent = false;
let emailError: string | undefined;
let emailId: string | undefined;

try {
  const result = await sendMealPlanEmail(plan);
  emailSent = true;
  emailId = result.emailId;
  console.log("Meal plan email sent successfully:", emailId);
} catch (error) {
  emailError = error instanceof Error ? error.message : "Failed to send email";
  console.error("Failed to send meal plan email:", error);
}

return NextResponse.json({ success: true, plan, emailSent, emailError });
```

**Response contract changes:**
- Success + email sent: `{ success: true, plan: MealPlan, emailSent: true }`
- Success + email failed: `{ success: true, plan: MealPlan, emailSent: false, emailError: "..." }`
- Generation failure: unchanged `{ error: "..." }` with 500

### Phase 3: Tests

**Files to create:**
- `src/lib/email.test.ts`

**Files to modify:**
- `src/app/api/generate-plan/route.test.ts` — add email integration tests

#### `src/lib/email.test.ts` test cases

**`parseRecipients` tests:**
- Single email → `["alice@example.com"]`
- Multiple emails → `["alice@example.com", "bob@example.com"]`
- Whitespace handling → trims entries
- Empty entries filtered → `"a@b.com,,c@d.com"` → `["a@b.com", "c@d.com"]`
- Empty/undefined input → throws
- Whitespace-only input → throws

**`formatMealPlanEmail` tests:**
- Returns `{ html, text }` with correct structure
- HTML contains all 5 dinner recipe names
- HTML contains grocery list items
- `alternativeNote` rendered when present, omitted when null
- Special characters in recipe names are HTML-escaped
- Date is human-formatted in subject
- Plain-text version contains same content without HTML tags

**`sendMealPlanEmail` tests:**
- Happy path: mocks Resend, verifies `emails.send()` called with correct args, returns email ID
- Resend return-value error: `{ data: null, error: { message: "..." } }` → throws
- Resend thrown exception (network error) → propagates
- Missing `EMAIL_FROM` → throws descriptive error
- Missing `EMAIL_RECIPIENTS` → throws descriptive error

#### Route integration tests (additions to `route.test.ts`)

- Happy path: plan generated + email sent → 200 with `emailSent: true`
- Email failure: plan generated + email throws → 200 with `emailSent: false, emailError: "..."`
- Plan includes full `MealPlan` object in both email success and failure cases

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md](docs/brainstorms/2026-02-21-meal-assistant-mvp-brainstorm.md) — Key decisions: Resend over Gmail SMTP (simpler, no OAuth), 100 emails/day free tier sufficient, recipients configurable via env var.

### Internal References

- Meal plan types: `src/types/meal-plan.ts` (MealPlan, MealPlanDinner, GroceryItem)
- Generate-plan route: `src/app/api/generate-plan/route.ts:249` (current response return)
- Resend client singleton: `src/lib/resend.ts` (needs refactor to lazy init)
- Supabase lazy init pattern: `src/lib/supabase.ts` (reference for getResend())
- Gemini lazy init pattern: `src/lib/gemini.ts` (reference for getResend())
- MVP plan Phase 4-5: `docs/plans/2026-02-21-feat-meal-assistant-mvp-plan.md`

### External References

- Resend Node.js SDK: https://resend.com/docs/sdks/node
- Resend free tier limits: https://resend.com/pricing
