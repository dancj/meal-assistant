# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meal Assistant is a personal meal-planning app — eventually a weekly plan + grocery list pulled from a private recipe repo. The original Supabase + Gemini + cron stack was stripped in #63; the replacement stack is being built across issues #64–#70 (see "Active Work" below). Today, this repo is a Next.js shell with shadcn UI primitives and the Resend library — no database, no LLM, no cron.

Do not reintroduce Supabase, SQLite, `better-sqlite3`, `@google/genai`, or the weekly GitHub Actions cron. Recipes live in a private GitHub repo (fetched via the API in #64), generation runs through Claude (#66), and email is optional (#70).

## Commands

- `npm run dev` — Start dev server with Turbopack
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm run test` — Run unit tests (Vitest)
- `npm run test:watch` — Run tests in watch mode
- `npm start` — Start production server
- `npm run cypress:open` / `npm run cypress:run` — Cypress e2e (interactive / headless)
- `npm run e2e` — Boot dev server + run Cypress headless

## Test-Driven Development

**All `feat:` and `fix:` work MUST follow TDD red-green-refactor discipline.** This applies to all implementation — whether initiated by `/ce-work`, `/ce-plan`, subagents, or direct coding.

- **Unit / component / route-handler tests:** Follow `meal-assistant:tdd-vitest` — write a failing Vitest test before writing implementation code, make it pass with the minimum code, then refactor.
- **End-to-end tests:** Follow `meal-assistant:tdd-cypress` — write a failing Cypress test that defines the user-visible acceptance criteria before building the feature.
- **Bug fixes:** Reproduce the bug as a failing test first, at whichever level it manifests, then fix it.

Plans created by `/ce-plan` do NOT need to explicitly list RED/GREEN/REFACTOR steps — the TDD cycle is implicit in all implementation work. The plan defines *what* to build; TDD defines *how* to build it. Cycles live in commits or the task tracker, not the plan body.

**When implementing any plan unit or task:**

1. Write a failing test that describes the expected behavior
2. Run the relevant suite (`npm test -- <path>` or `npm run cypress:run`) and confirm it fails for the right reason
3. Write the minimum implementation to make it pass
4. Run the full suite to confirm nothing else broke
5. Refactor on green; never refactor on red
6. Commit when the unit is complete (test + implementation in the same logical commit, or test commit immediately followed by green commit — your call)

**Skip TDD only for:** configuration changes, boilerplate wiring, pure styling / Tailwind class changes, trivial renames, doc / plan / fixture updates, and exploratory spikes.

The skill files at `.claude/skills/meal-assistant/tdd-vitest/SKILL.md` and `.claude/skills/meal-assistant/tdd-cypress/SKILL.md` are the source of truth — read them before starting feature or fix work.

## Architecture

- **Framework:** Next.js 15 with App Router, React 19, TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 via PostCSS (CSS-based config with `@theme` directives, no `tailwind.config.ts`)
- **UI primitives:** shadcn on top of `@base-ui/react`
- **Path alias:** `@/*` maps to `./src/*`
- **Deployment:** Vercel (free tier)

### Source Layout

All source code lives under `src/`:
- `src/app/` — pages, layouts, and API routes (`src/app/api/[route]/route.ts`). `src/app/page.tsx` is a thin server component that reads `RESEND_API_KEY` (and `DEMO_MODE`) and forwards an `emailEnabled` boolean to the client UI. Implemented routes: `GET /api/recipes` (#64), `GET /api/deals` (#65), `POST /api/generate-plan` (#66), `GET /api/log` + `POST /api/log` (#68), `GET /api/pantry` (#69), `POST /api/email` (#70).
- `src/components/` — UI components: `home-page.tsx` (the client page body, accepts `emailEnabled`), `deals-sidebar.tsx`, `meal-card.tsx` (active thumb states wired in #68), `grocery-list.tsx`, `email-button.tsx` (#70), plus shadcn primitives under `src/components/ui/`
- `src/lib/` — shared utilities. Currently: `api/` (typed client wrappers `fetchRecipes`, `fetchDeals`, `fetchRecentLogs`, `fetchPantry`, `postMealLog`, `generatePlan`, `sendEmail` + `ApiError`), `recipes/` (GitHub-backed recipe reader), `deals/` (Flipp-backed Safeway + Aldi deals), `plan/` (Claude-powered meal-plan generator + `assertMealPlan` shape helper), `log/` (multi-doc YAML log parser + GitHub upsert + recent-weeks reader), `pantry/` (frontmatter parser + single-file GitHub reader for `/pantry.md`), `plan-ui/` (client-side state machine + `usePlanState` React hook + thumb/skip-reason wiring), `email/` (HTML+text formatter + Resend sender + typed errors for `/api/email`), `demo/fixtures.ts` (sample recipes/deals/plan/logs/pantry returned when `DEMO_MODE=1`), `resend.ts` (lazy Resend client factory), `email.ts` (`parseRecipients` helper), `utils.ts` (`cn` className merger)
- `src/test/` — Vitest setup
- `docs/plans/` — dated implementation plans
- `docs/brainstorms/` — requirements / discovery docs
- `docs/solutions/` — past bugs and best practices, organized by category with YAML frontmatter
- `docs/design-system.md` — design system reference

Feature-specific directories (`src/types/`, `src/lib/storage/`, etc.) will be reintroduced by the feature PRs that need them. Do not pre-create them.

### Active Work

The new stack is being built feature-by-feature. Each open issue owns its own endpoint, env vars, types, and docs:

- **#64** — `/api/recipes`: reads markdown recipes from a private GitHub repo (`GITHUB_PAT`, `RECIPES_REPO`, `RECIPES_PATH`). **Implemented.** Recipe logic lives in `src/lib/recipes/` (pure parser + fetcher); the route is a thin error-mapping layer. Recipes are non-recursive — one directory depth, `.md` files only, dotfiles filtered.
- **#65** — `/api/deals`: Safeway + Aldi deals via Flipp backend (`SAFEWAY_ZIP`, `ALDI_ZIP`, both optional, default `34238`). **Implemented.** Deals logic lives in `src/lib/deals/` (pure parser + per-store fetcher + orchestrator); the route is a thin error-mapping + header layer. Flyers are cached 6 hours via Next.js fetch Data Cache; per-store failure returns 200 with `X-Deals-Errors`, all-store failure returns 502. Note: ZIP `34238` (the default) has no Safeway coverage — set `SAFEWAY_ZIP` to a real Safeway market to get Safeway deals.
- **#66** — `POST /api/generate-plan`: Claude-powered meal plan generation (`ANTHROPIC_API_KEY`). **Implemented.** Plan logic lives in `src/lib/plan/` (pure prompt + validator + thin orchestrator); the route is a thin error-mapping layer. Accepts `{ recipes, deals, logs, pantry, preferences? }` and returns a `MealPlan` with 5 meals + grouped grocery list. Uses model `claude-sonnet-4-6` (issue specified an older snapshot; bumped to current default per house style). Recipe block is marked with `cache_control: ephemeral` for prompt caching across same-week generations. 60-second `AbortController` timeout; upstream errors → 502, malformed model output → 502, missing key → 500.
- **#67** — Single-page UI: deals sidebar, 5 meal cards, store-grouped grocery list. **Implemented.** `src/app/page.tsx` is a client component that on mount calls `/api/recipes` + `/api/deals` in parallel, then `POST /api/generate-plan` with `logs: []` and `pantry: []` (until #68/#69). State machine in `src/lib/plan-ui/state.ts`; orchestration in `usePlanState`. "Regenerate plan" re-issues the call; "Swap this meal" re-issues the call and replaces only one meal slot plus the grocery list. Thumbs up/down render but no-op (wired in #68). No "Email me this" surface (deferred to #70). Layout `<main>` widened from `max-w-3xl` to `max-w-7xl` to fit the sidebar+meals grid.
- **#68** — `/api/log`: meal logging to monthly files in the recipes repo. **Implemented.** `src/lib/log/` houses the multi-doc YAML parser/serializer, GitHub read/write/upsert (single 409 retry on stale SHA), and the recent-weeks orchestrator (fans out across the latest 2 monthly `/log/YYYY-MM.md` files). `POST /api/log` upserts one `{ week, cooked, skipped, skipReason? }` block per call; `GET /api/log?weeks=8` returns the last N entries newest-first. The `MealLog` placeholder is replaced by the real shape (re-exported from `src/lib/log/types`). Page wires thumbs end-to-end: each thumb click POSTs the current week's full snapshot; thumbs-down expands a single shared inline skip-reason input. `GITHUB_PAT` now requires Contents: **Read+Write** scope.
- **#69** — Pantry awareness: read `/pantry.md`, exclude staples from grocery list. **Implemented.** `src/lib/pantry/` houses the multi-key YAML parser and a single-file GitHub reader (raw Accept). `GET /api/pantry` returns `{ staples: string[]; freezer: string[] }`; missing `pantry.md` returns empty pantry (200, not 404). The `pantry: string[]` placeholder in `GeneratePlanInput` is replaced by `Pantry` (re-exported from `src/lib/pantry/types`). Prompt distinguishes hard exclusion (`staples`) from soft preference (`freezer` — date/store metadata in parens preserved verbatim). Page mount fans out to four parallel fetches; pantry-fetch failure degrades to empty pantry + warning toast.
- **#70** — Optional `POST /api/email` via Resend, gated on `RESEND_API_KEY`. **Implemented.** Email logic lives in `src/lib/email/` (pure formatter + Resend sender + typed errors); the route is a thin error-mapping layer that re-uses `assertMealPlan` for body validation. The plan page is now `src/app/page.tsx` (server component) → `src/components/home-page.tsx` (client) — the server reads `RESEND_API_KEY` (or `DEMO_MODE`) and forwards `emailEnabled` so the client can conditionally render `<EmailButton />`. Click POSTs the in-memory plan (no regeneration) and surfaces the Resend message id on success or the upstream error on failure as a toast. Demo mode forces visibility and short-circuits the route to `{ ok: true, id: "demo-email-id" }` with `X-Demo-Mode: 1`. With Resend unset, the button is hidden and the rest of the app works unchanged. Logs and error responses never include `RESEND_API_KEY`, `EMAIL_FROM`, or recipient addresses.

When starting work, check the relevant issue for its shape contracts (recipe schema, meal plan schema, etc.) — they are the source of truth, not old plan files.

### Environment Variables

See `.env.example`. Currently in use:

- `GITHUB_PAT` (required by `/api/recipes`, `/api/log`, and `/api/pantry`) — fine-grained PAT with Contents: **Read and Write** scope on the recipes repo (write is required for `/api/log` introduced in #68; `/api/recipes` and `/api/pantry` are read-only). Never interpolate its value into error messages.
- `RECIPES_REPO` (required by `/api/recipes`) — `owner/name`, e.g. `your-username/your-recipes`.
- `RECIPES_PATH` (required by `/api/recipes`) — directory inside the repo; empty string means repo root. Non-recursive.
- `SAFEWAY_ZIP`, `ALDI_ZIP` (optional, used by `/api/deals`) — 5-digit ZIPs for Flipp flyer lookup; both default to `34238` when unset. Invalid values return 500.
- `ANTHROPIC_API_KEY` (required by `/api/generate-plan`) — Anthropic API key (paid; no free tier). Get one at https://console.anthropic.com. Never interpolate its value into error messages.
- `RESEND_API_KEY` (optional, used by `POST /api/email` and `src/app/page.tsx` for button visibility) — when set, the page renders an "Email me this" button and the route delivers the in-memory plan via Resend. When unset, the button is hidden and `/api/email` returns 500 if called directly. Never interpolate its value into error messages.
- `EMAIL_FROM` (required when `RESEND_API_KEY` is set) — the `from` address Resend sends as. Note: the Resend free tier (`onboarding@resend.dev`) only delivers to the account-owner inbox; use a verified custom domain to deliver to other recipients.
- `EMAIL_RECIPIENTS` (required when `RESEND_API_KEY` is set) — comma-separated list of recipient email addresses. Whitespace is trimmed; empty entries are filtered.
- `DEMO_MODE` (optional, dev convenience) — when set to `1`, every API route returns fixture data from `src/lib/demo/fixtures.ts` without calling GitHub, Flipp, Anthropic, or Resend, and the email button is rendered regardless of `RESEND_API_KEY`. Lets the UI render and exercise every surface without any creds. Each demo response also sets an `X-Demo-Mode: 1` header. Leave unset for normal operation.

Each future feature issue adds the env vars it consumes in the same PR that introduces the consumer.
