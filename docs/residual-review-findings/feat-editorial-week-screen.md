# Residual Review Findings — feat/editorial-week-screen

Source: `ce-code-review mode:autofix` run `20260503-232612-642968dd` on commit `8441673` (after autofix). 8 reviewers dispatched (correctness, testing, maintainability, project-standards, api-contract, kieran-typescript, agent-native, learnings).

Verdict: **Ready with fixes**. Four safe_auto fixes applied automatically (CLAUDE.md Source Layout refresh, dead `WeekHeaderData` export removed, dead `?? "MON"` defensive removed from `formatDayShort`, ISO week-53 test added + test name typo fixed). The findings below are residual `downstream-resolver` work — most fold naturally into Phase 2's SwapDrawer follow-up or Phase 3's API enrichment.

This file is the durable sink because no PR is open at the time of this review. When the PR is opened, this content can be moved into the PR body and the file deleted.

## Residual Review Findings

- **[P2] manual** — `src/lib/week-ui/index.ts` (synthesizeDay) — `DAY_KEYS[index] ?? "MON"` silently produces a wrong day code when index ≥ 5. Latent today (5-meal invariant), but the spec describes a 7-day timeline and the API may eventually ship 7 meals. The `?? "MON"` is a bug-hider — cleaner to constrain the parameter type (`index: 0 | 1 | 2 | 3 | 4`) or throw on out-of-range. _(kieran-typescript)_
- ~~**[P2] manual** — `src/components/cadence-pulse.tsx` — Component built and tested but has zero in-page consumers~~ **Resolved** in the SwapDrawer PR (Phase 2 item 7): CadencePulse is the centerpiece of each `<SwapSuggestion>`, lighting up with real `lastMade`-derived data from `recentLogs`. The component was simultaneously refactored from `daysAgo: number | null` to a tagged-union `state` prop (`unknown` | `never` | `days`) so the "never cooked" domain state is distinguishable from the "API not yet shipping the field" deployment state.
- **[P2] manual** — `src/lib/week-ui/index.ts` (`DayRowData.metadata`) — Field is written by `synthesizeDay` (always all-null in Phase 2) but never read by `MealRow`. Same forward-compat seam concern as CadencePulse — decide between consuming it now or marking it explicitly as a Phase 3 consumer-pending field. _(maintainability)_
- ~~**[P2] manual** — `src/components/meal-row.test.tsx` — Coverage gaps inherited from the deleted `meal-card.test.tsx`~~ **Resolved** in the SwapDrawer PR: both missing scenarios (thumbs-down click dispatches `actions.onThumbsDown(index)` and a disabled Swap button does not fire `actions.onSwap`) added when `MealRow` was migrated from flat callbacks to the grouped `actions` prop.
- **[P3] gated_auto** — `src/components/home-page.tsx` LoadingState — Hand-rolls `<ol className="border-t border-paper-edge">` with per-item `border-b border-paper-edge` instead of routing through `<HairlineList as="ol">`. Functionally OK but creates a silent desync risk if HairlineList's hairline strategy changes (e.g., `[&>*+*]:border-t` selector). Suggested fix: wrap the 5 Skeleton `<li>` items in `<HairlineList as="ol">` and drop the per-row border. _(kieran-typescript)_
- **[P3] manual** — `src/components/kid-note.tsx` + `src/lib/week-ui/index.ts` (`synthesizeDay`) — `KidNote.who` is plumbed through (typed `string | null`, conditional `<Pill>` render branch, both branches tested) but the synthesizer always emits `who: null` because family-member names land in Phase 3 Settings. Decision: drop the unreachable plumbing now, or wire real names through Phase 3. Either is fine; both reviewers flagged the inconsistency. _(maintainability + kieran-typescript — corroborated)_
- ~~**[P3] manual** — `src/components/meal-row.tsx` (props) — 8 props on the row component~~ **Resolved** in the SwapDrawer PR: the three callbacks are now grouped into a single `actions: { onSwap, onThumbsUp, onThumbsDown }` prop, leaving room for future SwapDrawer/pin/skip-reason callbacks without prop bloat.
- ~~**[P3] manual** — `src/components/cadence-pulse.tsx` — `daysAgo: number | null` encodes "data not yet available" (a deployment fact) rather than a domain state~~ **Resolved** in the SwapDrawer PR: refactored to `state: { kind: "unknown" } | { kind: "never" } | { kind: "days"; n: number }`. SwapDrawer's first real consumer emits `"never"` when no log entry matches and `"days"` otherwise; `"unknown"` is reserved for future API-pending callers.

## Advisory observations (FYI, not blocking) — demoted in autofix mode

- **`src/components/meal-row.test.tsx`** — Metadata-row omission unverified. Every test sets `metadata: { protein: null, prepMinutes: null, daysAgo: null }`, but no test asserts the *absence* of a metadata mono row. When Phase 3 lights up the metadata fields, nothing locks in the all-null hide behavior. _(testing)_
- **No e2e/cypress for the Editorial layout** — `cypress/e2e/` doesn't exist; jsdom can't exercise the `md:flex-row` breakpoint switch. Acknowledged in plan; defer to a follow-up alongside the SwapDrawer PR. _(testing)_
- **Token-class assertions are brittle** — Tests probe `text-h2`, `bg-forest`, `bg-rose-ink`, `bg-forest-soft`, `text-forest-2`, `w-[120px]`, `text-mono-sm`. A design-token rename breaks ~6 tests with zero behavior change. _(testing)_
- **`useMemo(getMondayOfWeek, [])` weekStart stability invariant** — Comment in `home-page.tsx` calls out the explicit invariant; no test guards a future refactor that drops the `useMemo`. _(testing)_
- **`src/lib/plan-ui/week.ts` now imports from `src/lib/week-ui/`** — Acceptable today (week-ui is dep-free) but the directory naming implies a UI scope it doesn't actually have. Future maintainer adding a React/DOM dep to `week-ui` will silently break the email API route. _(maintainability)_
- **`src/components/cadence-pulse.tsx` line 31 comment narrates the next line of code** — Should explain the design rationale (newest-on-the-right per design/spec.md §3.3) instead of restating what the code already shows. _(maintainability)_
- **Plan body still lists EventChip in U2** — The ce-doc-review carry-forward dropped EventChip from this PR's scope, but the plan body wasn't edited (per the ce-work rule "Do not edit the plan body during execution"). Intentional documentation drift. _(maintainability)_
- **`useMemo` weekStart goes stale across UTC midnight** — Tab open across the Sun→Mon UTC boundary shows the prior week's Eyebrow + day labels until reload. Acknowledged in code comment; minor user-visible defect for a meal planner reviewed before/after dinner. _(correctness)_
- **`formatMmmDay` zero-pads day-of-month** — Output is "Apr 27 — May 03" / "May 01" rather than the more standard "May 1". Tests lock the format, so this is intentional consistency; verify with design intent. _(correctness)_

## Coverage

- 8 reviewers dispatched, 0 failures
- Cross-reviewer corroboration: 3 fingerprints (CadencePulse dead-code, KidNote.who plumbing, formatDayShort dead-defensive)
- 4 safe_auto fixes applied silently
- 8 advisory findings demoted in autofix mode (above)
- Run artifact: `/tmp/compound-engineering/ce-code-review/20260503-232612-642968dd/`
