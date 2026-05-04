# Residual Review Findings — feat/editorial-primitives

Source: `ce-code-review mode:autofix` run `20260503-223508-27890cfa` on commit `7fb1fea` (after autofix). 8 reviewers dispatched (correctness, testing, maintainability, project-standards, api-contract, kieran-typescript, agent-native, learnings).

Verdict: **Ready with fixes**. One safe_auto fix applied automatically (drop redundant Button function-level defaults — cva `defaultVariants` already injects them). The findings below are residual `downstream-resolver` work for a follow-up PR.

This file is the durable sink because no PR was open at the time of the review. When the PR for this branch is opened, this content can be moved into the PR body and the file deleted.

## Residual Review Findings

- **[P2] manual** — `src/components/ui/drawer.test.tsx` — Drawer focus-trap behavior not exercised. Plan R10 lists focus trap as an acceptance criterion; base-ui provides the trap, but no test verifies tabbing stays inside the popup. _(testing)_
- **[P2] manual** — `src/components/ui/button.test.tsx` — Button `render` prop polymorphism is documented in plan U3 but has no test. Adding `<Button render={<a href="/x" />}>` and asserting `tagName === "A"` would lock the contract. _(testing)_
- **[P2] manual** — `src/components/meal-card.test.tsx` — Migrated thumb-down rose-ink override and the variant/size migration in `meal-card.tsx` have no test assertion. The in-PR rename (`default → primary`, `outline → default`, `icon-sm → icon`) is unguarded against regression. _(testing)_
- **[P2] manual** — `src/components/ui/hairline-list.test.tsx` — Tests assert the `[&>*+*]:border-t [&>*+*]:border-paper-edge` selector string is on the parent, not that children actually receive a top border. JSDOM doesn't apply Tailwind, so a behavioral test would need a stylesheet or computed-style harness. Acknowledge limit explicitly or add a Cypress smoke. _(testing)_
- **[P2] manual** — `src/components/ui/hairline-list.tsx` — Generic `as` parameter is cosmetic: `HairlineListProps<T extends HairlineListAs = "div">` declares `T` but never uses it to constrain children, props, or ref. Body casts `as` and forwards a flat `HTMLAttributes<HTMLElement>`, so `<HairlineList as="ol" start={1}>` is type-rejected even though `start` is valid on `<ol>`. Fix options: drop the unused generic, or rebuild with `React.ComponentPropsWithoutRef<T>` so element-specific props flow. _(kieran-typescript, maintainability — corroborated)_
- **[P3] manual** — `src/components/ui/button.test.tsx` — Coarse-pointer hit-area test asserts only that the class string contains `(pointer:coarse)]:min-h-8`, not that the computed touch target is actually 32×32 in a `pointer:coarse` environment. Acceptable today (JSDOM can't evaluate `@media (pointer:coarse)`); flag as a Cypress/Playwright candidate. _(testing)_
- **[P3] manual** — `src/components/ui/pill.test.tsx` — Pill icon-prefix `[&>svg]:size-3` descendant selector is listed in the plan as a behavior to support but is uncovered. Add a render with a child `<svg>` and assert the resolved class on the svg. _(testing)_
- **[P3] manual** — `src/components/ui/drawer.test.tsx` — Backdrop-click-to-close is a base-ui Dialog behavior we rely on for both Drawer and Modal but is not tested. _(testing)_
- **[P3] manual** — `src/lib/utils.ts` — Custom tailwind-merge font-size class group has no direct unit test. Add a regression test that asserts `cn("text-rose-ink", "text-body-sm")` keeps both classes — this is the exact case that broke during U1. _(testing)_

## Advisory observations (FYI, not blocking)

- **`src/lib/utils.ts`** — tailwind-merge custom class groups don't include the Editorial bg/text color tokens. The meal-card thumb-down `bg-rose-ink hover:bg-rose-ink/90 active:bg-rose-ink/90` override survives via CSS source order, not merge dedup. Latent fragility for future overrides on Editorial-color cva variants. _(correctness)_
- **`src/components/ui/dialog.tsx`** — `DialogFooter` / `DrawerFooter` `sticky bottom-0` is dead CSS in flex-column layout where the body region is the scroll container; visual is supplied by flex. Code-quality nit, not a bug. _(correctness)_
- **`src/components/ui/dialog.tsx`** — Drawer/Dialog dropped the visually-hidden `Close` text alongside the close button; `aria-label="Close"` on the button is sufficient for screen readers but the change is worth noting. _(correctness)_
- **`src/app/globals.css`** — `--duration-fast: var(--duration-fast)` and `--duration-medium: var(--duration-medium)` inside `@theme inline` are the documented Tailwind v4 bridge pattern (declarations don't write to `:root`, they configure utility generation), but read as suspicious to first-time readers. A short comment would help. _(correctness, maintainability — corroborated)_
- **`src/components/ui/dialog.tsx`** — Modal alias re-exports (`Modal === Dialog`, etc.) currently have zero consumers — adds a two-names-for-one-thing maintenance tax until Phase 3 consumes them. _(maintainability)_
- **`src/components/ui/dialog.tsx`, `src/components/ui/drawer.tsx`** — Header/Body/Footer slot trios share ~90% of classNames and the close-button block is verbatim copy. Watch for the third surface before extracting. _(maintainability)_
- **`src/components/ui/pill.tsx`** — `[&>svg]:size-3` is fixed at 12px regardless of size prop; at `sm` (h-5 with eyebrow ~10.5px mono text) icons render visually larger than the surrounding text. Verify before relying on icon-prefixed sm pills. _(api-contract)_

## Coverage

- 6 single-reviewer findings at confidence anchor 50 with no cross-corroboration were suppressed.
- 2 fingerprints promoted by cross-reviewer agreement (HairlineList generic + globals.css self-ref vars).
- 0 reviewers failed or timed out.
- Run artifact: `/tmp/compound-engineering/ce-code-review/20260503-223508-27890cfa/`
