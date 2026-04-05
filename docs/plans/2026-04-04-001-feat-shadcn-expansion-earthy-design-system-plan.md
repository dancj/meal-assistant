---
title: "feat: Expand shadcn/ui components with earthy design system"
type: feat
status: completed
date: 2026-04-04
deepened: 2026-04-04
---

# feat: Expand shadcn/ui components with earthy design system

## Overview

Evolve the Meal Assistant UI from its current warm green/teal palette to a richer earthy & organic visual identity — olive, terracotta, warm browns — while expanding shadcn component usage for better UX patterns (dialogs, toasts, skeletons, tabs, tooltips). Create a formal design system document that future work references for consistency.

## Problem Frame

The app is functional and already uses shadcn (v4.1.1, base-nova style) with 6 components (Button, Input, Textarea, Label, Badge, Card). Two areas need improvement:

1. **Visual identity is generic.** The current teal/green primary doesn't convey the earthy, rustic, homey feel the user wants. Raw HTML elements (`<button>`, `<textarea>`, `<input>`) are still used in some pages (generate page) instead of shadcn components. Status badges on the generate page use raw `<span>` with hardcoded Tailwind colors instead of semantic tokens.

2. **UX patterns are basic.** Delete confirmation uses `window.confirm`. Success/error feedback is inline-only. Loading states are bare spinners. The generate page's dinners and grocery list are shown together with no navigation structure.

## Requirements Trace

- R1. Shift color palette to earthy/organic: olive primary, terracotta accent, warm brown neutrals
- R2. Add shadcn Dialog, Skeleton, Sonner (toast), Separator, Tabs, Tooltip components
- R3. Replace raw HTML form elements and status badges with shadcn components on all pages
- R4. Replace `window.confirm` with Dialog for delete confirmation
- R5. Add toast notifications for success/error feedback on recipe CRUD and plan generation
- R6. Add skeleton loading states on home page and recipe detail page
- R7. Add Tabs on generate page to switch between Dinners and Grocery List views
- R8. Add Tooltip to icon-only nav elements
- R9. Create a formal `docs/design-system.md` brand guide documenting palette, typography, spacing, and component usage
- R10. Maintain dark mode cohesion with the new palette
- R11. All existing tests (Vitest + Cypress) continue to pass

## Scope Boundaries

- No new pages or features — purely visual and UX polish
- No layout restructuring (keep max-w-3xl single-column layout)
- No sidebar, navigation menu, or avatar components — app is too small to need them
- No Select, Dropdown Menu, or Sheet components in this pass — no concrete use case identified; install when needed
- No new API routes or data model changes
- No font changes — keep Geist Sans and Geist Mono
- Tooltip used only on nav icon buttons — not applied to every icon across the app

## Context & Research

### Relevant Code and Patterns

- **Existing shadcn components:** `src/components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `badge.tsx`, `card.tsx` — all use `@base-ui/react` primitives with CVA variants
- **Theme system:** `src/app/globals.css` — CSS variables in oklch color space, `@theme inline` bridge to Tailwind, light and dark mode blocks
- **shadcn config:** `components.json` — style `base-nova`, icon library `lucide`, aliases configured
- **Component installation:** `npx shadcn@latest add <name>` — auto-selects base-nova variants
- **Pages using raw elements:** `src/app/generate/page.tsx` uses `<textarea>`, `<input>`, `<button>` instead of shadcn equivalents; status badges use hardcoded color classes (`bg-green-100 text-green-800`)
- **Delete pattern:** `src/components/DeleteButton.tsx` uses `window.confirm` — should use Dialog
- **Loading pattern:** `src/app/page.tsx` and `src/app/recipes/[id]/page.tsx` use bare `<Loader2>` spinner

### External References

- shadcn/ui docs: component installation, theming with CSS variables, base-nova style
- oklch color space: hue 90-100 for warm browns/ambers, 120-140 for olive greens, 25-40 for terracotta reds

## Key Technical Decisions

- **Earthy palette in oklch:** Shift primary from hue 155 (teal) to ~135 (olive green), add terracotta accent at hue ~35, warm brown neutrals at hue ~60-80. oklch gives perceptually uniform color mixing — the existing system already uses it, so this is a value swap, not a structural change.

- **Semantic color tokens:** Add `--success`, `--success-foreground`, `--warning`, `--warning-foreground` CSS variables and register them in `@theme inline` (as `--color-success: var(--success)` etc.). This replaces hardcoded `bg-green-100 text-green-800` / `bg-amber-100 text-amber-800` patterns on the generate page with `bg-success text-success-foreground`. Important: success hue should be visually distinct from the olive primary (~hue 135) — use a brighter, higher-chroma green at hue 145-155 to maintain distinction.

- **Sonner for toasts:** shadcn v4 uses `sonner` (not Radix toast). Add `<Toaster />` to root layout. Call `toast()` / `toast.error()` from client components for transient notifications.

- **Dialog for delete:** Replace `window.confirm` with shadcn Dialog component. Keep the same two-step pattern (click delete → confirm in dialog → execute). This is accessible and styleable.

- **Tabs on generate page:** Use shadcn Tabs to separate Dinners from Grocery List once a plan is generated. This improves scannability without changing data flow.

- **Design system doc format:** Markdown in `docs/design-system.md` with visual swatches (oklch values + descriptions), typography scale, spacing conventions, and component usage guidelines. Living document that implementation references.

## Open Questions

### Resolved During Planning

- **Should we change fonts?** No — Geist Sans/Mono are modern and neutral; the earthy feel comes from color, not typography.
- **Should we use shadcn's built-in dark mode toggle?** No — the app doesn't currently have a toggle and adding one is out of scope. The dark mode CSS variables will be updated to match the earthy palette for when dark mode is triggered externally.
- **Tabs vs accordion for generate page?** Tabs — the two sections (dinners, groceries) are peer-level content, not progressive disclosure.

### Deferred to Implementation

- Exact oklch values for the palette — will be tuned visually during implementation, with lightness and chroma targets documented in the design system doc before final values are committed

## Implementation Units

- [ ] **Unit 1: Define earthy color palette and design system document**

**Goal:** Establish the earthy/organic color palette, update all CSS variables, add semantic tokens, and create the formal design system doc.

**Requirements:** R1, R9, R10

**Dependencies:** None

**Files:**
- Modify: `src/app/globals.css`
- Create: `docs/design-system.md`

**Approach:**
- Replace `:root` CSS variable values with earthy palette: olive green primary (~hue 135, moderate chroma), terracotta accent (~hue 35), warm brown neutrals (~hue 70-80)
- Add `--success`, `--success-foreground`, `--warning`, `--warning-foreground` variables to both light and dark blocks
- Register new tokens in `@theme inline` block
- Update `.dark` block with corresponding dark-mode values (deeper olive, muted terracotta, warm dark browns)
- Update card, popover, muted, border, input colors to carry warm brown undertones
- Write `docs/design-system.md` documenting: brand direction, color palette (each token with oklch value, purpose, and usage guidance), typography scale, spacing conventions, border radius, component usage patterns, dark mode approach

**Patterns to follow:**
- Existing oklch variable structure in `src/app/globals.css`
- Existing `@theme inline` registration pattern

**Test expectation:** none — pure CSS variable changes and documentation. Visual verification that light and dark modes look cohesive.

**Verification:**
- `npm run build` and `npm run lint` pass
- Light mode shows earthy olive/terracotta/brown palette
- Dark mode is cohesive (not just inverted)
- `docs/design-system.md` exists and covers palette, typography, spacing, component guidelines

- [ ] **Unit 2: Install new shadcn components**

**Goal:** Add all needed shadcn components via CLI so they're available for subsequent units.

**Requirements:** R2

**Dependencies:** Unit 1 (palette should be set first so new components inherit correct theme)

**Files:**
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/sonner.tsx` (or Toaster wrapper)

**Approach:**
- Run `npx shadcn@latest add dialog skeleton separator tabs tooltip sonner`
- CLI auto-installs `sonner` npm package and any needed `@base-ui/react` sub-packages
- Verify components land in `src/components/ui/` — note that Dialog, Tabs, and Tooltip use `@base-ui/react` primitives (base-nova matters here), while Skeleton is pure CSS (styled div) and Sonner is a standalone library (base-nova irrelevant)
- Separator is a simple styled div, no primitive dependency

**Test expectation:** none — scaffolding only, no behavioral changes yet.

**Verification:**
- All component files exist in `src/components/ui/`
- `npm run build` passes with no import errors
- `sonner` appears in `package.json` dependencies

- [ ] **Unit 3: Add Toaster to root layout and replace raw nav elements**

**Goal:** Wire up Sonner toast provider in root layout. Replace raw HTML link styles in nav with Button components. Add Tooltip to nav buttons.

**Requirements:** R3, R5, R8

**Dependencies:** Unit 2

**Files:**
- Modify: `src/app/layout.tsx`

**Approach:**
- Import and render `<Toaster />` from sonner component inside `<body>`, after `<main>`
- Wrap nav links in `Button` with `asChild` (or appropriate base-nova equivalent) so they use proper button variants instead of duplicating button styles in className strings
- Add `Tooltip` around icon-adjacent nav buttons for accessibility — note: base-ui Tooltip does not require a wrapping `TooltipProvider` (unlike Radix), so `<Tooltip>` can be used directly
- Keep the sticky header, backdrop blur, and max-w-3xl container unchanged

**Patterns to follow:**
- Existing `buttonVariants` usage in `src/app/recipes/[id]/page.tsx`
- shadcn Sonner docs for Toaster placement

**Test scenarios:**
- Happy path: Layout renders with Toaster provider present in DOM
- Happy path: Nav buttons render correctly with Button component styling
- Edge case: Tooltip shows on hover/focus for nav buttons

**Verification:**
- Nav links use Button component instead of raw className duplication
- Toaster is rendered in the DOM (visible in React DevTools or page source)
- `npm run test` passes — existing layout-dependent tests unaffected

- [ ] **Unit 4: Replace raw elements on generate page with shadcn components**

**Goal:** Upgrade the generate page to use shadcn Input, Textarea, Button, Badge, and Separator instead of raw HTML elements. Replace hardcoded color badges with semantic Badge variants.

**Requirements:** R3, R5

**Dependencies:** Unit 3 (Toaster available for toast calls)

**Files:**
- Modify: `src/app/generate/page.tsx`

**Approach:**
- Replace `<textarea>` with shadcn `Textarea`
- Replace `<input type="password">` with shadcn `Input`
- Replace `<button>` with shadcn `Button`
- Replace status badge `<span>` elements with `<Badge>` using appropriate variants:
  - "Week of" → `<Badge variant="outline">` or `<Badge variant="secondary">`
  - "Demo plan" → `<Badge variant="secondary">` with warning semantic
  - "Email sent" → `<Badge variant="secondary">` with success semantic
- Add `Separator` between input section and plan display
- Add `toast.success()` call after successful plan generation
- Add `toast.error()` call for generation errors (keep inline error for auth-specific flow)

**Patterns to follow:**
- Form patterns in `src/components/RecipeForm.tsx`
- Badge usage in `src/components/RecipeList.tsx`

**Test scenarios:**
- Happy path: Generate page renders with shadcn form components
- Happy path: Successful generation shows toast notification
- Error path: Failed generation shows toast error
- Edge case: Auth error still shows inline error (not just toast) since user needs to interact with the secret input

**Verification:**
- No raw `<textarea>`, `<input>`, or `<button>` elements on generate page
- Status badges use `<Badge>` component with semantic color tokens
- Toast notifications fire on success and error
- Existing generate page functionality unchanged

- [ ] **Unit 5: Add Tabs for Dinners / Grocery List on generate page**

**Goal:** Wrap the dinners and grocery list sections in a Tabs component so users can switch between them.

**Requirements:** R7

**Dependencies:** Unit 4

**Files:**
- Modify: `src/app/generate/page.tsx`

**Approach:**
- Wrap dinners and grocery list in `<Tabs defaultValue="dinners">`
- Two `TabsTrigger` buttons: "Dinners" (with UtensilsCrossed icon) and "Grocery List" (with ShoppingCart icon)
- Each section becomes a `TabsContent`
- Tabs only render when a plan exists
- Keep the existing card/list structure within each tab

**Patterns to follow:**
- shadcn Tabs component API

**Test scenarios:**
- Happy path: After generating a plan, Tabs render with "Dinners" selected by default
- Happy path: Clicking "Grocery List" tab shows grocery items and hides dinners
- Happy path: Clicking "Dinners" tab switches back
- Edge case: When no plan exists, Tabs do not render

**Verification:**
- Plan display uses Tabs for dinners/groceries navigation
- Both tab contents display correctly with existing data
- Tab state is client-side only (no URL changes needed)

- [ ] **Unit 6: Replace window.confirm with Dialog in DeleteButton**

**Goal:** Swap the browser-native confirm dialog with a shadcn Dialog for recipe deletion.

**Requirements:** R4

**Dependencies:** Units 2 and 3 (Dialog component from Unit 2; Toaster provider from Unit 3 needed for toast calls)

**Files:**
- Modify: `src/components/DeleteButton.tsx`

**Approach:**
- Wrap existing button in `Dialog` component with controlled open state
- Clicking the delete button opens the dialog
- Dialog content: warning message, recipe name if available, Cancel and Delete buttons
- Cancel closes dialog; Delete executes the existing delete logic
- Replace `alert()` error with `toast.error()` (Sonner available from Unit 3)
- Add `toast.success()` on successful deletion before redirect
- Note z-index stacking: if a toast fires while the Dialog is open (e.g., delete error), ensure toast renders above the dialog overlay. Sonner defaults to high z-index but verify layering.

**Patterns to follow:**
- shadcn Dialog component (base-nova variant with `@base-ui/react`)
- Existing deletion logic in `src/components/DeleteButton.tsx`

**Test scenarios:**
- Happy path: Clicking Delete opens a confirmation dialog with Cancel and Confirm buttons
- Happy path: Confirming triggers deletion and redirects to home
- Happy path: Cancelling closes dialog without side effects
- Error path: Failed deletion shows toast error instead of `alert()`
- Edge case: Dialog closes and button re-enables if deletion fails

**Verification:**
- No `window.confirm` or `alert()` calls remain in DeleteButton
- Dialog is accessible (focus trap, escape to close)
- Existing delete test in `src/components/RecipeForm.test.tsx` or related tests still pass (may need minor updates if they assert on `window.confirm`)

- [ ] **Unit 7: Add skeleton loading states**

**Goal:** Replace bare spinner loading states with content-shaped Skeleton placeholders on home page and recipe detail page.

**Requirements:** R6

**Dependencies:** Unit 2

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/recipes/[id]/page.tsx`

**Approach:**
- Home page: Replace `<Loader2>` spinner with 3-4 skeleton recipe cards (matching Card shape with skeleton lines for title and tags)
- Recipe detail page: Replace spinner with skeleton layout matching the real content shape (title bar, metadata row, ingredient card, instruction card)
- Use `<Skeleton className="h-[x] w-[y]" />` for each placeholder element

**Patterns to follow:**
- shadcn Skeleton component — simple div with pulse animation
- Card layout structure from `src/components/RecipeList.tsx` for home page skeletons
- Card section structure from `src/app/recipes/[id]/page.tsx` for detail skeletons

**Test scenarios:**
- Happy path: Home page shows skeleton cards while loading, then renders recipe list
- Happy path: Recipe detail page shows skeleton layout while loading, then renders recipe
- Edge case: Skeleton renders correctly when immediately replaced (fast load)

**Verification:**
- No bare `<Loader2>` spinners remain as the sole loading indicator on these pages
- Skeleton shapes match the real content layout
- Existing component tests pass (`src/app/page.component.test.tsx`)

- [ ] **Unit 8: Add Separator and visual polish across pages**

**Goal:** Apply Separator components and minor visual polish across all pages for consistent section separation and earthy design coherence.

**Requirements:** R3

**Dependencies:** Units 1, 2

**Files:**
- Modify: `src/app/recipes/[id]/page.tsx`
- Modify: `src/app/recipes/new/page.tsx`
- Modify: `src/app/recipes/[id]/edit/page.tsx`
- Modify: `src/components/RecipeList.tsx`
- Modify: `src/components/RecipeForm.tsx`

**Approach:**
- Recipe detail: Add `Separator` between metadata and card sections
- Recipe list: Ensure tag filter badges and recipe cards use earthy palette semantic tokens consistently (verify accent, primary, secondary usage aligns with new palette)
- Recipe form: Verify the accent background on the servings/prep/cook row looks good with earthy palette; adjust opacity if needed
- Add `toast.success()` after successful recipe create and edit — note: the submit handlers live in `src/app/recipes/new/page.tsx` and `src/app/recipes/[id]/edit/page.tsx`, not in RecipeForm.tsx (which only receives an onSubmit callback)

**Patterns to follow:**
- shadcn Separator component
- Existing Card/Badge/Button patterns in the codebase

**Test scenarios:**
- Happy path: Recipe detail page renders Separator between sections
- Happy path: Successful recipe save shows toast notification
- Edge case: Earthy palette renders correctly on all badge variants (default, secondary, outline)

**Verification:**
- Visual consistency across all pages with earthy palette
- Separators provide clear section boundaries
- Toast notifications on recipe CRUD operations
- All existing tests pass

- [ ] **Unit 9: Final validation and test pass**

**Goal:** Run full test suite, build, and lint to ensure no regressions. Fix any test failures caused by DOM structure changes.

**Requirements:** R11

**Dependencies:** All previous units

**Files:**
- Modify (if needed): `src/app/page.component.test.tsx`
- Modify (if needed): `src/components/RecipeForm.test.tsx`

**Approach:**
- Run `npm run lint`, `npm run test`, `npm run build`
- Fix any test assertions that break due to DOM changes (e.g., tests that looked for `window.confirm` in DeleteButton, tests that assert on specific loading spinner markup)
- Do NOT change test behavior — only update selectors/assertions to match new DOM structure
- Verify dark mode visually

**Test scenarios:**
- Happy path: `npm run lint` passes with no errors
- Happy path: `npm run test` passes with all existing tests green
- Happy path: `npm run build` completes without errors
- Edge case: Tests that mock `window.confirm` need updating for Dialog-based flow

**Verification:**
- Clean lint, test, and build output
- No regressions in existing functionality
- Dark mode is visually cohesive with earthy palette

## System-Wide Impact

- **Interaction graph:** Sonner's `<Toaster />` in root layout affects all pages — any client component can call `toast()`. Dialog in DeleteButton is self-contained. Tabs on generate page are self-contained.
- **Error propagation:** Error handling patterns shift from `alert()` to `toast.error()` in DeleteButton, and from inline-only to inline+toast on generate page. No changes to API error handling.
- **State lifecycle risks:** None — all changes are UI-only. No new client state persisted. Toast state is ephemeral (auto-dismisses).
- **API surface parity:** No API changes.
- **Unchanged invariants:** All API routes, data models, storage layer, email delivery, and GitHub Actions automation are unchanged. Recipe CRUD functionality is unchanged — only the visual presentation and interaction patterns evolve.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| shadcn CLI installs Radix-based components instead of base-nova | `components.json` specifies `"style": "base-nova"` — CLI should auto-select. Verify Dialog, Tabs, and Tooltip imports use `@base-ui/react` (Skeleton and Sonner have no primitive dependency). |
| Earthy palette reduces contrast below WCAG AA | Use oklch lightness values that maintain ≥4.5:1 contrast ratio for text on backgrounds. Test with browser contrast checker. |
| Success green too similar to olive primary | Use hue 145-155 for success (brighter, higher chroma) vs hue ~135 for primary (muted olive). Verify visual distinction in both light and dark modes. |
| `sonner` npm package introduces bundle size increase | sonner is ~3KB gzipped — acceptable for the UX improvement. Already standard in shadcn ecosystem. |
| Toast z-index layering with Dialog | Sonner defaults to z-[9999]. If Dialog overlay uses high z-index, verify toast renders above it. Test by triggering a delete error while Dialog is open. |
| Tests mock `window.confirm` or `window.alert` | Unit 6 replaces these with Dialog. Tests that mock `window.confirm` need rewriting to find and click the Dialog confirm button. Unit 9 handles this explicitly. |
| Dark mode looks muddy with earthy tones | Use higher chroma and adjusted lightness in dark mode — earthy doesn't mean desaturated. Terracotta and olive can be vibrant on dark backgrounds. |

## Sources & References

- Previous visual plan (completed): `docs/plans/2026-03-18-002-feat-visual-warmth-and-color-polish-plan.md`
- Current theme: `src/app/globals.css` — oklch color system
- shadcn/ui docs: component installation, theming, base-nova style
- oklch color reference: lightness (L), chroma (C), hue (H) — earthy hues at 35 (terracotta), 70-80 (warm brown), 135 (olive)
