# Residual Review Findings — feat/generate-plan-claude

Source: `ce-code-review` autofix run `20260425-002737-8a07b43b` against branch `feat/generate-plan-claude`.

Safe-auto fixes (14 items: SDK retry override, type tightening, conditional preferences spread, regex loosening, validate ↔ generate dedup, route logging, JSDoc invariant, CLAUDE.md inventory) were applied in commit `f42f118` and verified with `npm test` (192 passing), `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

The findings below are the **residual actionable work** — issues with concrete fixes that change behavior, contracts, or sensitive boundaries beyond what `safe_auto` should land unattended. They need a human decision before merge or in a follow-up PR.

## Residual Review Findings

### P0 — Critical

| # | File | Issue | Reviewer(s) | Confidence | Route |
|---|------|-------|-------------|------------|-------|
| 1 | `src/app/api/generate-plan/route.ts:13` | Unauthenticated POST to paid Anthropic API enables cost-drain abuse. Public Vercel URL + no auth + no rate limit = anyone who finds the URL can burn the API key. **Fix:** add a shared-secret header check, Vercel Edge rate limiting, or a per-IP token bucket before public exposure. | security | 75 | manual → human |

### P1 — High

| # | File | Issue | Reviewer(s) | Confidence | Route |
|---|------|-------|-------------|------------|-------|
| 2 | `src/lib/plan/generate.ts:53` | `validateInput` casts `recipes`/`deals`/`logs` straight to typed arrays without per-element shape checks. A POST like `{recipes: [null], deals: [], logs: [], pantry: []}` passes validation, then `compactRecipes` dereferences `r.title` on null → unhandled TypeError → 500. The "trust because they came from our endpoints" comment is wrong — this is an open POST. **Fix:** per-element guards on title/tags/kidVersion (recipes), store (deals), date/title (logs); or wrap `buildPrompt` in the generate try-block and translate to `InvalidRequestError`. | adversarial, kieran-typescript, api-contract, correctness, security, maintainability | 75–95 | manual → downstream-resolver |
| 3 | `src/lib/plan/validate.ts:17` | `FENCE_RX` is anchored `^...$`, so any leading/trailing prose ("Sure! \`\`\`json{...}\`\`\` Let me know") makes the strip a no-op and `JSON.parse` throws. We applied a narrow safe_auto fix (loosened the inner-newline requirement), but the prose-wrapped case still fails. **Fix:** brace-balanced extraction from the first `{` to the matching `}`, or accept fenced blocks anywhere in the string, not just at boundaries. | adversarial | 90 | manual → downstream-resolver |
| 4 | `src/app/api/generate-plan/route.ts:16` | No request-body size limit on the POST handler. `request.json()` has no default cap and `validateInput` doesn't bound array lengths — input-token cost amplification by oversized payloads. **Fix:** `Content-Length` check (reject > ~256 KB) and per-array length caps. | security | 75 | manual → human |

### P2 — Moderate

| # | File | Issue | Reviewer(s) | Confidence | Route |
|---|------|-------|-------------|------------|-------|
| 5 | `src/lib/plan/types.ts:11` & `validate.ts:79` | `DealMatchOnMeal.store` is plain `string`; `GroceryItem.store` is the strict `Store` union. Same conceptual field, two contracts — UI #67 will struggle to join them. **Fix:** tighten `DealMatchOnMeal.store` to `Store` and call `expectStore` in the validator, or document the asymmetry. | api-contract, adversarial, correctness | 75–100 | gated_auto → human |
| 6 | `src/lib/plan/anthropic.ts:8` | `TIMEOUT_MS = 60_000` equals Vercel `maxDuration = 60` exactly — zero headroom for `validateMealPlan` + `Response.json` + cold-start TLS handshake before the platform hard-kills the lambda and replaces our structured 502 with an opaque platform 504. **Fix:** drop `TIMEOUT_MS` to ~55_000. | reliability | 75 | manual → human |
| 7 | `src/lib/plan/generate.ts:84` | `AbortController` abort path produces a generic `AnthropicNetworkError` with no signal that *we* cancelled vs the network died. Plan committed to a distinct timeout mapping; implementation didn't deliver it. **Fix:** detect `controller.signal.aborted` (or `err.name === "AbortError"`) and throw a dedicated `AnthropicTimeoutError` → 504. | reliability, correctness | 75 | manual → review-fixer |
| 8 | `src/app/api/generate-plan/route.ts:55` | `MalformedPlanError` logs the field path but **not the raw model output** that triggered it. Every prod 502 needs local repro to investigate. **Fix:** attach truncated `rawText` (first ~2 KB) and Anthropic `response.id` to the error in `generate.ts` and log them in the route. | reliability | 75 | manual → human |
| 9 | `src/app/api/generate-plan/route.ts:42` | Three different 502 response shapes (upstream / network / malformed) with no consistent `kind` discriminator — clients have to per-key-detect what kind of failure happened. **Fix:** unified envelope `{error, kind: "upstream" \| "network" \| "malformed", upstreamStatus?, path?}`. | api-contract | 100 | manual → human |
| 10 | `src/lib/plan/anthropic.ts:5` | `MAX_TOKENS = 4096` may truncate output for large recipe libraries (30+ recipes → long grocery list). SDK returns `stop_reason: "max_tokens"` rather than an error; we ignore it; `JSON.parse` fails on the truncated tail; user sees generic `MalformedPlanError` 502 with no signal that the cause was truncation. **Fix:** bump to ~8192 with headroom, and inspect `response.stop_reason` to surface a distinct error class. | adversarial, maintainability | 75 | advisory → human |
| 11 | `src/lib/plan/prompt.ts:96` | Unbounded `preferences` string is both a cost-amplification vector (100 KB string blows the prompt) and a soft prompt-injection vector. **Fix:** cap `preferences` length (e.g., 2000 chars) in `validateInput`; consider wrapping in delimited sentinels. | adversarial, security | 75 | manual → human |
| 12 | `src/lib/plan/prompt.ts:88` | Whitespace/empty pantry strings turn the "omit if matches pantry" rule into "omit everything." Couples directly to #69's pantry parser — an upstream blank line becomes a silent grocery-list-deletion bug here. **Fix:** drop empty/whitespace-only entries in `validateInput`, or reject with `InvalidRequestError`. | adversarial | 80 | manual → human |
| 13 | `src/lib/plan/types.ts:4` | `Store` union and `STORES` array are defined in **both** `lib/deals/types.ts` (`'safeway' \| 'aldi'`) and `lib/plan/types.ts` (adds `'costco' \| 'wegmans'`). They will drift. **Fix:** hoist a single canonical `Store` enum, or make plan's `Store` extend deals' members. | maintainability | 75 | manual → human |
| 14 | `src/lib/plan/validate.ts:17` | The system prompt explicitly says "No markdown code fences" but `stripFences` accepts them — the validator silently rewards the model for breaking the prompt contract. Pick one canonical rule. | maintainability | 50 | advisory → human |

### P3 — Low

| # | File | Issue | Reviewer(s) | Confidence | Route |
|---|------|-------|-------------|------------|-------|
| 15 | `src/lib/plan/anthropic.ts:24` | `_resetAnthropicClientForTests` ships a test seam in the production bundle. Cleaner: inject the client into `generatePlan` as an optional dependency and let tests pass a stub directly. Kills both the export and the `vi.mock` indirection. | kieran-typescript, maintainability | 50 | manual → human |
| 16 | `src/lib/plan/errors.ts` | Duplicate `MissingEnvVarError` exists in `src/lib/recipes/github.ts`. Both are caught via `instanceof` so they're non-interchangeable. Extract a shared class. | maintainability | 100 | manual → human |
| 17 | `src/lib/plan/types.ts:38` | `MealLog` placeholder will collide with the real type from #68. Add an explicit `TODO(#68)` comment so a future grep finds it. | maintainability | 50 | advisory → human |

## Advisory & Residual Risks

- **Validator is shape-only, not semantically checked.** Hallucinated meal titles, mismatched deal-store casing, and grocery items for unpicked meals all pass through. Cross-referencing `meals[].title` against `input.recipes` is free (recipes are already in the request) and would catch the most common semantic drift.
- **Validator silently drops unknown response keys.** Defensive default, but not documented in the prompt — adding a model-output field requires touching both `types.ts` and `validate.ts` together. Consider an extra-key check that throws `MalformedPlanError` to force lockstep evolution.
- **Module-scoped Anthropic client cached for the lifetime of the serverless instance.** Key rotation requires redeploy. Operational risk only at single-household scale.
- **No retries on Anthropic transient errors (429, 529).** Acceptable single-household, but if #67's UI auto-triggers generation, retry storms could burn the budget.
- **`groceryItem.quantity` accepts empty string while `item` does not.** Asymmetry will surface as blank UI badges. Decide whether empty quantities are an "unknown" sentinel or a malformed-equivalent.

## Testing Gaps (worth adding before #67)

- **Timeout/AbortController path is untested.** Fake-timers test with a never-resolving `messages.create` asserting catch fires within `TIMEOUT_MS`.
- **Validator non-object guards** (meals/grocery items / nested deal matches) lack negative tests.
- **`validateInput` with malformed nested shapes** (`recipes: [null]`, `deals: [{store: "walmart"}]`) is untested — the cast hole is unverified by tests.
- **SDK returning `stop_reason: "max_tokens"`** with truncated JSON has no test.
- **Empty/whitespace pantry entries** — the "omit everything" failure path is undetected.
- **Concurrent first-call to `getAnthropicClient`** — single-instance invariant is asserted by structure but not by test.
- **Prose-wrapped JSON in `validateMealPlan`** has no test (the F4 narrow autofix only addresses the no-newline variant).

## Run Artifacts

Per-reviewer JSON output: `.context/compound-engineering/ce-code-review/20260425-002737-8a07b43b/` (gitignored; local only).
