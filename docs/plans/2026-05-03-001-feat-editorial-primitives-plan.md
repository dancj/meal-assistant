---
title: "feat: Editorial design primitives (Pill, Eyebrow, HairlineList, Drawer, Modal, refreshed Button)"
type: feat
status: active
date: 2026-05-03
origin: design/spec.md  # §3 + §6 of design-system.md; tracking issue #86 / follow-up to PR #87
---

# feat: Editorial design primitives (Pill, Eyebrow, HairlineList, Drawer, Modal, refreshed Button)

## Overview

Phase 1.2 of the Editorial UI makeover (issue #86). PR #87 landed the token layer (named CSS vars + Tailwind utilities + type/radius/motion scale). This plan ships the **portable, domain-agnostic primitives** the rest of the makeover (Week screen, Library, Cadence, Settings, Add Meal modal) will compose from:

- **Pill** — `forest` / `slate` / `amber` / `rose` color modes, `sm` / `md` sizes, pill-shaped.
- **Eyebrow** — mono uppercase tracked label (11px / 0.08em / `--ink-3`).
- **HairlineList** — parent that applies a `--paper-edge` top border to every child except the first.
- **Drawer** — right-anchored, 420px default, backdrop, focus trap, Esc-to-close, slide+fade per Editorial motion tokens.
- **Modal** — centered card, 640px wide, sticky-footer pattern, max 90vh. Implemented as an Editorial restyle of the existing `src/components/ui/dialog.tsx` (the `@base-ui/react/dialog` primitive); `Modal` ships as an alias re-export so consumer code can use either name. Throughout this plan, "Modal" refers to the Editorial-styled product surface and "Dialog" refers to the underlying primitive file being modified — they describe the same component.
- **Button refresh** — `primary` (forest) / `ghost` (transparent) / `default` (paper + paper-edge), sizes `sm` / `md` / `icon` (28×28). Replaces the current shadcn-default variant set (outline/secondary/destructive/link) which no longer matches the design language.

No domain components ship here (KidNote, EventChip, CadencePulse stay in Phase 2). No screen-level changes — the existing `home-page.tsx` continues to render with whatever Button callsites it has, migrated minimally.

---

## Problem Frame

Today the only styled UI primitives in the repo are vanilla shadcn (`Button`, `Card`, `Badge`, `Dialog`, `Input`, `Label`, `Textarea`, `Separator`, `Skeleton`, `Sonner`, `Tabs`, `Tooltip`). Their visual language (variant names, sizes, default-rounding) is shadcn-stock and doesn't match the Editorial spec at design/design-system.md §6 ("Components (portable)") or design/spec.md §3.5 ("Standard buttons"). The next several PRs in the makeover will need:

- A pill component for theme labels, slate metadata chips, kid-mod amber tiles, dislike/allergen rose chips.
- An eyebrow utility component (mono / uppercase / tracked) since the same treatment appears on every screen.
- A hairline-divided list construct (Library, Grocery, Cadence rules, settings panes — all rule-divided).
- A right-side drawer for the Swap flow (design/spec.md §3.1 SwapDrawer, 420px, slides 220ms).
- A 640px centered modal for Add Meal (design/spec.md §2.7).
- A button vocabulary that matches the spec's three variants + icon (28×28) — *not* shadcn's six.

Building these once, portable and domain-agnostic, lets every Phase 2/3 PR land in fewer lines and stay consistent.

---

## Requirements Trace

- R1. **Pill primitive** with `forest` / `slate` / `amber` / `rose` color modes (background = `*-soft` token, text = `*-ink` token; forest uses `--forest-soft` / `--forest-2`) and `sm` (h-5) / `md` (h-6) sizes, rounded-pill. Supports an icon-prefix slot. *(design/design-system.md §6, design/spec.md §3.4 EventChip / §2.5 family chips / theme pills)*
- R2. **Eyebrow component** rendering as `<span>` by default, accepts a `render` prop (base-ui pattern) to swap the element. Text is mono / 11px / 0.08em / uppercase / `--ink-3`. *(design/design-system.md §"Type system" eyebrow row)*
- R3. **HairlineList** — a wrapper that applies `border-top: 1px solid var(--paper-edge)` to all children **except the first**. Works with arbitrary children (cards, divs, custom rows). *(design/design-system.md §6 "HairlineList")*
- R4. **Drawer** — right-side, 420px default width, opens with `translateX(100% → 0)` over `--duration-medium` (220ms) using `--ease-editorial`. Backdrop fades over the same duration. Focus traps inside, Esc closes, click-outside closes. Honors `prefers-reduced-motion`. *(design/design-system.md §"Motion", design/spec.md §3.1)*
- R5. **Modal** — centered, 640px max width, max 90vh. Header / body / sticky footer composition. Same focus-trap / Esc / click-outside semantics as Drawer. *(design/spec.md §2.7)*
- R6. **Button** with three variants (`primary` = forest bg + paper text; `ghost` = transparent bg + paper-edge border on hover; `default` = paper bg + paper-edge border + ink text) and three sizes (`sm` = h-7 / 12px text; `md` = h-9 / 14px text, default; `icon` = 28×28 square, ≥ 32×32 effective hit target via padding for touch). Hover/press transitions use `--duration-fast`. *(design/spec.md §3.5)*
- R7. **All primitives** must consume the named Editorial tokens (`--paper`, `--ink`, `--forest`, `--paper-edge`, `--*-soft`, `--*-ink`) directly via Tailwind utilities (`bg-paper`, `text-ink`, `border-paper-edge`, etc.) — *not* the shadcn-aliased `--background` / `--primary` / etc. This makes the primitive's color contract unambiguous in code review.
- R8. **Existing Button callsites** must be migrated to the new variant/size vocabulary in the same PR — no back-compat shim, per CLAUDE.md ("Don't use feature flags or backwards-compatibility shims when you can just change the code").
- R9. **TDD** for behavior per `meal-assistant:tdd-vitest` (focus trap, Esc-to-close, HairlineList border application, Pill variant class output, Button variant rendering). Pure styling can skip TDD per CLAUDE.md.
- R10. **Accessibility** — Drawer/Modal trap focus (provided by base-ui Dialog) and close on Esc; icon-only Button must accept and forward `aria-label`; reduced-motion is already handled globally in `globals.css` (PR #87) but Drawer entrance must verify it degrades to opacity-only.

---

## Scope Boundaries

- No domain components: `KidNote`, `EventChip`, `CadencePulse`, `MealRow`, `DayLabel`, `ThemePill` — those land in Phase 2 (Week screen).
- No screen-level redesign — `src/app/page.tsx` and `src/components/home-page.tsx` keep their current layout. Only their imports of `Button` need to migrate to the new variant/size names where the spelling changes.
- No retirement of shadcn `Card`, `Input`, `Label`, `Textarea`, `Separator`, `Skeleton`, `Sonner`, `Tabs`, `Tooltip`. They keep working with the rebound semantic tokens from PR #87. Restyling them to Editorial is deferred until a screen actually consumes one (probably Phase 2/3).
- No removal of the existing `Badge` component — it's still used for status indicators in `meal-card.tsx` and is shaped differently from `Pill`. We add `Pill` alongside it; migration to `Pill` happens screen-by-screen as Phase 2 lands.
- No new routes, no API changes, no Storybook / docs site.

### Deferred to Follow-Up Work

- Restyle of remaining shadcn primitives (`Card`, `Input`, `Label`, `Textarea`, `Tabs`, `Tooltip`) to Editorial — deferred to the screen PR that first consumes them.
- Migrate `Badge` callsites to `Pill` — deferred to the screen PR that touches the relevant card / surface.
- Visual regression / Chromatic / Playwright snapshot coverage — deferred; we rely on Vitest + RTL behavior tests + manual `npm run dev` verification for now.

---

## Context & Research

### Relevant Code and Patterns

- `src/components/ui/button.tsx` — current Button, uses `@base-ui/react/button` + `cva` for variants. Pattern to mirror for the refreshed Button.
- `src/components/ui/dialog.tsx` — current Dialog, uses `@base-ui/react/dialog` primitive (Root, Trigger, Portal, Backdrop, Popup, Close, Title, Description). Already has focus trap, Esc-to-close, click-outside via base-ui. Pattern to mirror for both Modal (restyle) and Drawer (right-anchored variant).
- `src/components/ui/badge.tsx` — current Badge, uses `mergeProps` + `useRender` from base-ui for the polymorphic `render` prop. Pattern to mirror for `Eyebrow` (the same render-prop polymorphism is useful — eyebrow can be a `<span>`, `<p>`, `<div>`, etc.).
- `src/lib/utils.ts` — `cn()` className merger (clsx + tailwind-merge). All primitives should use it.
- `src/app/globals.css` — Editorial tokens from PR #87. New utilities to consume: `bg-paper`, `bg-paper-2`, `bg-paper-edge`, `text-ink`, `text-ink-2`, `text-ink-3`, `bg-forest`, `text-forest-2`, `bg-forest-soft`, `bg-amber-soft`, `text-amber-ink`, `bg-slate-soft`, `text-slate-ink`, `bg-rose-soft`, `text-rose-ink`. Also `text-eyebrow` (11px tracked), `text-body-sm`, `rounded-pill`, `rounded-md`, `duration-fast`, `duration-medium`, `ease-editorial`.
- Existing Button callsites that consume non-Editorial variants/sizes (must migrate in U3):
  - `src/components/email-button.tsx` — uses `variant="default"` (no change needed; default → `md`/`primary` should still cover it depending on chosen mapping)
  - `src/components/meal-card.tsx` — likely uses `variant="ghost"` and `size="icon-sm"`
  - `src/components/deals-sidebar.tsx`, `src/components/grocery-list.tsx`, `src/components/home-page.tsx` — assorted variants
  - Migration list will be confirmed via grep at unit start.
- `tw-animate-css` is already imported in `globals.css`. Use `data-open:animate-in`, `data-closed:animate-out`, `data-open:fade-in-0`, `data-open:slide-in-from-right-2`, etc. for entrances. Drawer entrance uses `slide-in-from-right`; Modal uses the existing `fade-in-0 zoom-in-95`.

### Institutional Learnings

- `docs/solutions/build-errors/` is the only solutions category that exists today; nothing relevant to UI primitives. No prior Editorial-system learnings to draw from — this is the first pass.
- CLAUDE.md ("Test-Driven Development" section) — feat work follows TDD via `meal-assistant:tdd-vitest`. Plans don't enumerate RED/GREEN/REFACTOR steps; cycles live in commits.
- CLAUDE.md ("Source Layout") — `src/components/ui/` is the home for shadcn primitives; new Editorial primitives live there too.

### External References

- `@base-ui/react` Dialog primitive docs (already in use) — provides Root / Trigger / Portal / Backdrop / Popup / Close / Title / Description with focus trap, Esc, click-outside. We don't need a new dependency for Drawer; same primitive with different positioning + entrance animation.
- design/design-system.md §6 — portable component checklist (the source of truth for this plan).
- design/spec.md §3.1 (SwapDrawer), §3.5 (Standard buttons), §2.7 (Add Meal modal) — behavior + sizing.
- design/tokens.json — color / type / radius / motion contract.

---

## Key Technical Decisions

- **Reuse `@base-ui/react/dialog` for both Modal and Drawer.** The primitive already provides focus trap, Esc-to-close, portal, and click-outside-to-close. Drawer is the same primitive with right-anchored positioning + slide-in-from-right transform. No new dependency. *(see origin: design/spec.md §3.1)*
- **Add `Pill` as a new component, not a Badge variant.** Editorial spec uses "pill" as the dominant terminology; Badge is shaped differently (4xl rounding, h-5 fixed) and serves a different role (status indicator vs. categorical chip). Keeping them separate avoids overloading either component. Migration of existing Badge callsites to Pill happens in screen PRs as those callsites are reworked.
- **Hard-replace Button variants/sizes** rather than aliasing. CLAUDE.md ("Don't use feature flags or backwards-compatibility shims when you can just change the code") + the codebase is small enough (~6 callsites) that a sweep is cheaper than maintaining two vocabularies. Variant rename: `default` → `primary`, `outline` → `default`, `secondary` → drop (use `default`), `destructive` → drop (no current callsites), `link` → drop, `ghost` → `ghost`. Size rename: `default` → `md`, `xs` → drop, `sm` → `sm`, `lg` → drop, `icon-xs` → drop, `icon-sm` → `icon`, `icon-lg` → drop. Concrete callsite migration deferred to U3 implementation.
- **Eyebrow as a component, not just a Tailwind class.** The `text-eyebrow` utility from PR #87 supplies size/tracking/lineheight. Eyebrow component bundles that with `font-mono`, `uppercase`, `text-ink-3` so consumers don't have to remember the four-class incantation. Polymorphic `render` prop (matching Badge's pattern) lets it be `<span>` / `<p>` / `<h6>` etc. *(design/design-system.md §"Type system")*
- **HairlineList as a wrapper, not a divider.** `[&>*+*]:border-t [&>*+*]:border-paper-edge` is the entire implementation in Tailwind. We expose it as a component so consumers can write `<HairlineList>` instead of remembering the selector incantation. No `as` prop — it's a `<div>` by default; consumers compose it with `<ul>` / `<ol>` semantics in the parent if needed (most lists in the spec are `<div>` with role-implied `list`).
- **Drawer width is a prop, not a token.** Spec says "420 default" so we expose `width?: number | string` defaulting to 420 to allow future flex (Settings might want a wider rail; a confirmation drawer might want narrower). No Tailwind class for width — pass via inline style.
- **Modal sticky footer is a slot, not a sub-component.** Compose with `<Modal.Footer>` that has `position: sticky; bottom: 0; background: paper-2; border-top: paper-edge`. Same compositional shape as the existing `DialogFooter`.
- **`prefers-reduced-motion` is already global** (PR #87 sets `transition-duration: 80ms` + `transition-property: opacity` for the `reduce` query). Drawer/Modal don't need extra logic; their slide degrades to opacity-only automatically. We *do* need a unit test that verifies the underlying transition CSS is keyed off the design tokens, not a hardcoded `220ms`, so the global cascade works.

---

## Open Questions

### Resolved During Planning

- **New primitive vs. extend existing?** Pill = new (different role from Badge). Eyebrow = new (small, opinionated). HairlineList = new (no analog). Modal = restyle the existing `DialogContent` to Editorial spec rather than create a new file. Drawer = new file. Button = restyle in place. Resolution above.
- **Where does Drawer live?** `src/components/ui/drawer.tsx`, parallel to `dialog.tsx`. Uses the same base-ui dialog primitive but with right-anchored layout.
- **Animation library?** `tw-animate-css` is already wired and works with base-ui's `data-open` / `data-closed` attributes. No new dependency.
- **TDD scope?** Behavior tests (focus trap, Esc, Hairline border presence, variant class output, Drawer entrance applies the right transform classes). Pure visual regression is out of scope.

### Deferred to Implementation

- **Exact migration list for `Button` callsites** — confirmed via `grep -rn "<Button" src/components src/app` at the start of U3.
- **Whether `Modal` exports new names (`Modal.Content`, `Modal.Footer`) or keeps the existing `Dialog*` exports** — TBD during U4; default plan is to keep `Dialog*` exports and re-style, then add `Modal` as an alias re-export so consumers can use either name. We'll choose during implementation based on which reads better at the eventual callsite (Add Meal modal is in Phase 3).
- **Should `Drawer` accept a `side` prop (`"right" | "left"`)?** YAGNI — spec only calls for right-side. Not adding until needed.

---

## Implementation Units

- U1. **Pill primitive**

**Goal:** Add a polymorphic `Pill` component with `forest` / `slate` / `amber` / `rose` color modes and `sm` / `md` sizes that consumers compose into theme labels, metadata chips, kid notes, and dislike/allergen tags.

**Requirements:** R1, R7

**Dependencies:** None (PR #87 tokens already merged or in flight).

**Files:**
- Create: `src/components/ui/pill.tsx`
- Create: `src/components/ui/pill.test.tsx`

**Approach:**
- Mirror `src/components/ui/badge.tsx` structure: `cva` for variants, `mergeProps` + `useRender` from `@base-ui/react` for polymorphism, `data-slot="pill"` attribute.
- Variants:
  - `forest`: `bg-forest-soft text-forest-2`
  - `slate`: `bg-slate-soft text-slate-ink`
  - `amber`: `bg-amber-soft text-amber-ink`
  - `rose`: `bg-rose-soft text-rose-ink`
- Sizes:
  - `sm`: `h-5 px-2 text-[11px]` (matches Badge default; for compact metadata)
  - `md`: `h-6 px-2.5 text-body-sm` (default; for theme pills, kid-name pills)
- Shape: `rounded-pill inline-flex items-center gap-1`.
- Icon slot: `[&>svg]:size-3` so callers can put a `<TacoIcon>` or `<FishIcon>` in front of the text per design/spec.md §2.1 theme pills.
- Export `Pill` and `pillVariants` (cva accessor) for consumers that want to merge classes.

**Patterns to follow:**
- `src/components/ui/badge.tsx` (cva + useRender + mergeProps).

**Test scenarios:**
- Happy path: renders `<Pill>Taco Tuesday</Pill>` with `bg-forest-soft text-forest-2` (default variant=forest), default size md.
- Happy path: each color variant (`slate` / `amber` / `rose`) applies the matching `bg-*-soft` and `text-*-ink` (or `text-forest-2` for forest) classes.
- Happy path: `size="sm"` applies `h-5` and the smaller text class; `size="md"` applies `h-6`.
- Happy path: `<Pill render={<button />}>` renders as a `<button>` element (polymorphism via base-ui `useRender`).
- Edge case: `<Pill className="custom">` merges `custom` after the variant classes (tailwind-merge wins for conflicting utilities).
- Integration: `<Pill><FishIcon />Fish Friday</Pill>` — the SVG child receives `size-3` via the descendant selector.

**Verification:**
- `npm test -- src/components/ui/pill.test.tsx` passes.
- All four variants visually confirm against design/tokens.json swatches in `npm run dev` storybook-style scratch page (or by temporarily mounting in `home-page.tsx`).

---

- U2. **Eyebrow + HairlineList primitives**

**Goal:** Two small portable wrappers — one for the mono-uppercase tracked label that appears on every Editorial screen, and one for the rule-divided list construct that replaces "boxed" cards.

**Requirements:** R2, R3, R7

**Dependencies:** None.

**Files:**
- Create: `src/components/ui/eyebrow.tsx`
- Create: `src/components/ui/eyebrow.test.tsx`
- Create: `src/components/ui/hairline-list.tsx`
- Create: `src/components/ui/hairline-list.test.tsx`

**Approach:**
- `Eyebrow`: span by default, polymorphic via `render` prop (mirror Badge's `useRender` pattern). Class string `font-mono text-eyebrow uppercase text-ink-3`. The `text-eyebrow` utility already encodes 11px size + 0.08em tracking from PR #87. Forward `className` so consumers can override color (e.g., on a forest tile where eyebrow needs to read on dark).
- `HairlineList`: `<div>` wrapper with class `[&>*+*]:border-t [&>*+*]:border-paper-edge`. No props beyond `children` and `className`. Optionally accept a `gap` prop later (deferred — YAGNI).

**Patterns to follow:**
- `src/components/ui/badge.tsx` for `Eyebrow` polymorphism (useRender + mergeProps).
- Vanilla functional component with `cn()` for `HairlineList`.

**Test scenarios:**
- Eyebrow happy path: `<Eyebrow>Apr 27 — May 03</Eyebrow>` renders a `<span>` with classes `font-mono text-eyebrow uppercase text-ink-3`.
- Eyebrow polymorphism: `<Eyebrow render={<p />}>` renders a `<p>` element.
- Eyebrow className merge: `<Eyebrow className="text-forest-2">` overrides `text-ink-3` (tailwind-merge resolves the conflict in favor of the explicit class).
- HairlineList happy path: `<HairlineList><div>a</div><div>b</div><div>c</div></HairlineList>` — first child has no top border; second and third each carry `border-t border-paper-edge` (verified via the `:not(:first-child)` selector applying).
- HairlineList edge case: single child renders without any top border (the `*+*` selector requires a sibling).
- HairlineList edge case: empty `<HairlineList />` renders an empty `<div>` without throwing.

**Verification:**
- `npm test -- src/components/ui/eyebrow.test.tsx src/components/ui/hairline-list.test.tsx` passes.
- Manual: a 3-row HairlineList in `home-page.tsx` (temporarily) shows two hairline rules between rows.

---

- U3. **Refreshed Button + callsite migration**

**Goal:** Replace the current shadcn-default Button variants (`default` / `outline` / `secondary` / `destructive` / `ghost` / `link`) and sizes (`default` / `xs` / `sm` / `lg` / `icon` / `icon-xs` / `icon-sm` / `icon-lg`) with the Editorial vocabulary from design/spec.md §3.5: variants `primary` / `default` / `ghost`, sizes `sm` / `md` / `icon`. Migrate all existing callsites in the same commit.

**Requirements:** R6, R7, R8

**Dependencies:** None — but should land before any new Phase 2/3 PR consumes Button so we're not migrating in two passes.

**Execution note:** Test-first for the variant/size class output; the callsite migration is a sweep that can follow the green test. After the sweep, run the full `npm test` + `npm run build` to confirm no callsite was missed.

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/button.test.tsx` *(create if absent)*
- Modify: every consumer found by `grep -rn "from \"@/components/ui/button\"\|<Button " src --include="*.tsx" --include="*.ts"` — confirmed list at unit start; expected ≤ 8 files.

**Approach:**
- Keep base-ui Button primitive + cva pattern.
- Variant classes:
  - `primary`: `bg-forest text-paper hover:bg-forest-2`
  - `default`: `bg-paper text-ink border border-paper-edge hover:bg-paper-2`
  - `ghost`: `bg-transparent text-ink hover:bg-paper-2 border border-transparent`
- Size classes:
  - `sm`: `h-7 px-2.5 text-body-sm gap-1.5 rounded-pill`
  - `md`: `h-9 px-3.5 text-body gap-2 rounded-pill` (default)
  - `icon`: `size-7 rounded-pill p-0` — visual is 28×28; ensure `min-h-8 min-w-8` (32×32) on coarse-pointer / touch via `pointer:coarse` media query (or wrap in a 32×32 hit-area). Resolved at unit start; preferred path is a `:where(@media (pointer: coarse))` rule that bumps min-size to 32px without changing the visual when `:hover` is enabled.
- Transition: `transition-colors duration-fast ease-editorial` (uses the new tokens).
- Focus ring: `focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper`.
- Drop the `outline` / `secondary` / `destructive` / `link` variants and `xs` / `lg` / `icon-xs` / `icon-sm` / `icon-lg` sizes entirely. (Per CLAUDE.md no back-compat.)

**Patterns to follow:**
- `src/components/ui/button.tsx` cva + base-ui structure.

**Test scenarios:**
- Happy path: `<Button>Click</Button>` renders with the `primary md` classes (`bg-forest text-paper h-9`).
- Happy path: each variant produces the spec'd classes (`primary` / `default` / `ghost`).
- Happy path: each size produces the spec'd classes (`sm` h-7, `md` h-9, `icon` size-7).
- Happy path: `<Button onClick={fn}>` — clicking fires `fn` (sanity that base-ui forwarding works).
- Edge case: `<Button disabled>` is non-interactive (`pointer-events-none opacity-50`).
- Edge case: `<Button render={<a href="/x" />}>` polymorphism still works (base-ui Button supports `render` slot).
- Integration: callsite migration — `grep -rn "variant=\"outline\"\|variant=\"secondary\"\|variant=\"destructive\"\|variant=\"link\"\|size=\"xs\"\|size=\"icon-sm\"\|size=\"icon-xs\"\|size=\"icon-lg\"\|size=\"lg\"\|size=\"default\"" src` returns zero results after migration.

**Verification:**
- `npm test` (full suite) passes — including any consumer-component tests that previously asserted on Button class names.
- `npm run build` succeeds.
- `npm run dev` — the existing home page renders with the new Button vocabulary, no console warnings, no visual regressions other than the intended palette/size shift.

---

- U4. **Drawer + Modal restyle**

**Goal:** Add a right-anchored `Drawer` component and restyle the existing `Dialog` (re-exported as `Modal` aliases) to the Editorial spec — both consume `@base-ui/react/dialog` for focus trap / Esc / click-outside, both honor the global `prefers-reduced-motion` rule.

**Requirements:** R4, R5, R7, R10

**Dependencies:** None directly; but composes with U3 Button (footer buttons inside Modal/Drawer use the refreshed Button variants).

**Files:**
- Create: `src/components/ui/drawer.tsx`
- Create: `src/components/ui/drawer.test.tsx`
- Modify: `src/components/ui/dialog.tsx` (restyle Popup, Backdrop, DialogFooter to Editorial palette + sticky-footer pattern; add `Modal` aliased re-export)
- Modify: `src/app/page.test.tsx` *only if* a previous test asserted on legacy Dialog class names (unlikely — confirmed at unit start).

**Approach:**
- **Drawer** uses `DialogPrimitive.Root` / `Portal` / `Backdrop` / `Popup` / `Close` / `Title` / `Description` from `@base-ui/react/dialog`.
  - Backdrop class: `fixed inset-0 z-50 bg-ink/20 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-medium ease-editorial`.
  - Popup class: `fixed inset-y-0 right-0 z-50 flex h-full w-[420px] flex-col bg-paper border-l border-paper-edge data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right duration-medium ease-editorial`.
  - Width prop: `width?: number | string` (default 420) → inline `style={{ width }}`.
  - Sub-components: `DrawerHeader` (eyebrow + title + close icon button rendered with `aria-label="Close"`), `DrawerBody` (scrollable, `flex-1 overflow-y-auto`), `DrawerFooter` (sticky bottom, `bg-paper-2 border-t border-paper-edge`).
- **Modal** restyle:
  - Popup class: replace `rounded-xl bg-popover ring-1 ring-foreground/10` with `rounded-md bg-paper border border-paper-edge max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col`.
  - Add a body slot (`ModalBody` / `DialogBody`) with `flex-1 overflow-y-auto` mirroring `DrawerBody` — the existing Modal has no scroll region, and Add Meal's six-field form (design/spec.md §2.7) will exceed 90vh on small viewports without it.
  - DialogFooter: change `bg-muted/50` → `bg-paper-2`, `border-t` → `border-t border-paper-edge`, keep `sticky bottom-0`.
  - Re-export `Modal = Dialog`, `ModalContent = DialogContent`, `ModalBody = DialogBody`, etc. for new consumers; existing `Dialog*` exports remain. *(Decision deferred but default per Open Questions.)*
- Both rely on the global reduced-motion rule from PR #87 — no extra logic needed in component, but a test verifies the duration is keyed off `--duration-medium` (i.e., the class `duration-medium` is in the rendered Popup `className`).

**Patterns to follow:**
- `src/components/ui/dialog.tsx` (existing structure for Portal/Backdrop/Popup composition).
- `tw-animate-css` data-open/data-closed selectors (already used in `dialog.tsx`).

**Test scenarios:**
- **Drawer**
  - Happy path: opens when controlled `open={true}`; renders Popup with `right-0` and the default `width: 420px` style.
  - Happy path: custom `<Drawer width={520}>` renders inline `width: 520px` style.
  - Happy path: pressing `Esc` while open calls `onOpenChange(false)` (verifies base-ui Esc handling fires through).
  - Happy path: clicking the Backdrop calls `onOpenChange(false)`.
  - Happy path: `<DrawerHeader>` slot renders with `bg-paper border-b border-paper-edge`; `<DrawerFooter>` is `sticky bottom-0 bg-paper-2 border-t border-paper-edge`.
  - Edge case: focus is trapped inside the Popup when open — `Tab` from the last focusable cycles to the first (verifiable via `userEvent.tab()` and asserting `document.activeElement`).
  - Integration: rendered Popup className contains `duration-medium ease-editorial slide-in-from-right` so the global `prefers-reduced-motion` cascade can collapse the slide to opacity-only.
- **Modal**
  - Happy path: existing Dialog tests still pass after the restyle (no behavior change, only classes).
  - Happy path: `<DialogContent>` rendered className contains `bg-paper border border-paper-edge max-w-[640px]`.
  - Happy path: `<DialogFooter>` rendered className contains `sticky bottom-0 bg-paper-2 border-t border-paper-edge`.
  - Happy path: `Modal` re-export resolves to the same component as `Dialog` (`expect(Modal).toBe(Dialog)`).
- Reduced-motion (covered by global rule; tested as a class-output assertion, not a CSS-engine check).

**Verification:**
- `npm test -- src/components/ui/drawer.test.tsx src/components/ui/dialog.test.tsx` passes.
- `npm run build` succeeds.
- Manual: a temporary `<Drawer open={true}>` mounted in `home-page.tsx` slides in from the right and closes on Esc / backdrop click. With `prefers-reduced-motion: reduce` (set via DevTools), the slide collapses to a fade.

---

## System-Wide Impact

- **Interaction graph:** No new entry points or middleware. New primitives are leaf components in the UI tree. Drawer/Modal use Portals so they render outside the normal DOM hierarchy (already the case for the existing Dialog).
- **Error propagation:** None — pure presentational primitives. No async, no error boundaries needed.
- **State lifecycle risks:** Drawer/Modal `open` state is controlled by the consumer (or uncontrolled via `defaultOpen`). Standard base-ui behavior; no custom state machine.
- **API surface parity:** `Pill` is *new* — no parity concern. `Eyebrow` / `HairlineList` are new. `Button` is a hard rename of variants/sizes; the only API surface that "leaves the repo" is Storybook (none) and external imports (none — internal only). Migration is contained to U3.
- **Integration coverage:** Vitest + RTL + base-ui's own `prefers-reduced-motion` plumbing. We don't need Playwright for these; Phase 2 (Week screen) will pick up Cypress smoke for the SwapDrawer flow.
- **Unchanged invariants:**
  - `globals.css` token layer from PR #87 is unchanged — these primitives consume it but don't modify it.
  - Existing `Card`, `Input`, `Label`, `Textarea`, `Separator`, `Skeleton`, `Sonner`, `Tabs`, `Tooltip` components are untouched. They still render with the rebound semantic tokens.
  - `Badge` is untouched. `Pill` ships alongside it, not as a replacement (yet).
  - All API routes (`/api/recipes`, `/api/deals`, `/api/generate-plan`, `/api/log`, `/api/pantry`, `/api/email`) are untouched.
  - All TDD discipline from CLAUDE.md continues to apply.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Button callsite migration misses a spot and breaks a render path that lacks test coverage. | After the variant/size sweep, run `grep` for the dropped variant/size string literals (zero matches expected) + `npm run build` (TypeScript catches unknown variant strings if Button props are typed via `VariantProps<typeof buttonVariants>`). The cva `VariantProps` typing already enforces this — passing an unknown variant becomes a type error. |
| `prefers-reduced-motion` global rule from PR #87 is too aggressive and breaks the slide entrance even when user hasn't set the preference. | The global rule is gated by the media query `@media (prefers-reduced-motion: reduce)`, so it only applies when the user explicitly reduces motion. Tested manually + a unit test asserts `duration-medium` is on the rendered className. |
| Drawer's `slide-in-from-right` Tailwind / `tw-animate-css` class doesn't compose with base-ui's `data-open` attribute. | `tw-animate-css` documents `data-open:animate-in data-open:slide-in-from-right` as the supported pattern; the existing `dialog.tsx` already uses `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95` successfully, so the same data-attribute hook works. Drawer test asserts the className renders. |
| Polymorphic `Eyebrow` / `Pill` `render` prop pattern from base-ui's `useRender` confuses consumers used to shadcn's `asChild`. | We adopt the existing repo idiom (`Badge` already uses `useRender`), so consumers see one consistent pattern across primitives. Document in `docs/design-system.md` only if confusion shows up in review. |
| 28×28 icon button fails 32px touch hit-target requirement (R6 / design/spec.md §6 a11y). | Implement via `:where(@media (pointer: coarse))` min-size bump to 32×32 — visual stays at 28 on mouse, hit area expands on touch. Verified at unit start; if browser support is iffy, fall back to a 32×32 hit-area wrapper around a 28×28 visual via padding. |

---

## Documentation / Operational Notes

- Update `docs/design-system.md` "Quick reference" to include the new component names (Pill, Eyebrow, HairlineList, Drawer, Modal, refreshed Button variants/sizes) so the doc stays current. Small inline addition; no new doc file.
- No env vars, no rollout, no monitoring. These are pure UI primitives.
- PR description references issue #86 and links to PR #87 (the prerequisite token layer).

---

## Sources & References

- **Origin design handoff:** `design/design-system.md` §6 ("Components (portable)"), `design/spec.md` §3.1 (SwapDrawer), §3.5 (Standard buttons), §2.7 (Add Meal modal), `design/tokens.json`.
- **Tracking issue:** [#86 — UI makeover: adopt Editorial design system](https://github.com/dancj/meal-assistant/issues/86)
- **Predecessor PR:** [#87 — feat(design): adopt Editorial design tokens (foundation)](https://github.com/dancj/meal-assistant/pull/87)
- **Related code:**
  - `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/dialog.tsx` (patterns to mirror)
  - `src/app/globals.css` (token layer to consume)
  - `src/lib/utils.ts` (`cn()` helper)
- **External docs:**
  - `@base-ui/react` Dialog primitive (already in the repo's dependency tree)
  - `tw-animate-css` data-open/data-closed selectors (already in the repo)
