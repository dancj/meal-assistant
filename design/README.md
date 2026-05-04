# Meal Assistant — Handoff Package

This folder is everything Claude Code needs to take the design from prototype to Next.js implementation.

## Contents

| File                | Purpose                                                                 |
|---------------------|-------------------------------------------------------------------------|
| `spec.md`           | Screen-by-screen description, component contracts, behaviors, data shapes. Start here. |
| `design-system.md`  | Portable design language |
| `tokens.json`       | Machine-readable design tokens (color, type, spacing, motion, radii).   |
| `data-model.ts`     | Suggested TypeScript types for Meal, FamilyMember, DaySlot, etc.        |

## Source prototype

The interactive reference is `Meal Assistant.html` at the project root. Open it for the source of truth on layout and interaction. The visual contract is the tokens — don't pixel-match against the prototype, match against `tokens.json`.

## Suggested implementation order

1. Set up tokens (`tokens.json` → CSS custom properties + Tailwind theme extension if you use it).
2. Lift portable components from `design-system.md` §6 into `components/ui/`.
3. Build the read-only Week screen end to end (hardest layout, gets you most of the type/motion system).
4. Library + Cadence + Grocery — same primitives, different shapes.
5. Settings (Family + Calendar).
6. Add Meal flow (last, it's a modal).

## Stack notes

- Next.js app router.
- Use server components for the read paths (`/`, `/library`, `/cadence`, `/grocery`, `/settings/*`).
- Server actions for swap, react, regenerate, sync-now.
- Add Meal as a parallel/intercepted route at `/library/new` so the library stays behind it.

## Open product questions to flag back to design

- Recipe instruction view — out of scope here, will be a separate pass.
- Multi-week planning — same.
- Skylight integration: prototype assumes OAuth-style connect. Real path is likely iCal feed paste or shared Google calendar. UI is provider-agnostic; only `SyncState.provider` needs to flex.
