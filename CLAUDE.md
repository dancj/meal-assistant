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

## Architecture

- **Framework:** Next.js 15 with App Router, React 19, TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 via PostCSS (CSS-based config with `@theme` directives, no `tailwind.config.ts`)
- **UI primitives:** shadcn on top of `@base-ui/react`
- **Path alias:** `@/*` maps to `./src/*`
- **Deployment:** Vercel (free tier)

### Source Layout

All source code lives under `src/`:
- `src/app/` — pages, layouts, and API routes (`src/app/api/[route]/route.ts`). Implemented routes: `GET /api/recipes` (#64), `GET /api/deals` (#65).
- `src/components/` — UI components (shadcn primitives under `src/components/ui/`)
- `src/lib/` — shared utilities. Currently: `recipes/` (GitHub-backed recipe reader — `types.ts`, `parse.ts`, `github.ts`), `deals/` (Flipp-backed Safeway + Aldi deals — `types.ts`, `parse.ts`, `flipp.ts`, `env.ts`, `errors.ts`), `plan/` (Claude-powered meal-plan generator — `types.ts`, `errors.ts`, `anthropic.ts`, `prompt.ts`, `validate.ts`, `generate.ts`), `resend.ts` (lazy Resend client factory, retained for #70), `email.ts` (`parseRecipients` helper), `utils.ts` (`cn` className merger)
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
- **#67** — Single-page UI: deals sidebar, 5 meal cards, store-grouped grocery list
- **#68** — `/api/log`: meal logging to monthly files in the recipes repo
- **#69** — Pantry awareness: read `/pantry.md`, exclude staples from grocery list
- **#70** — Optional `/api/email` via Resend, gated on `RESEND_API_KEY`

When starting work, check the relevant issue for its shape contracts (recipe schema, meal plan schema, etc.) — they are the source of truth, not old plan files.

### Environment Variables

See `.env.example`. Currently in use:

- `GITHUB_PAT` (required by `/api/recipes`) — fine-grained PAT with Contents: Read scope on the recipes repo. Never interpolate its value into error messages.
- `RECIPES_REPO` (required by `/api/recipes`) — `owner/name`, e.g. `your-username/your-recipes`.
- `RECIPES_PATH` (required by `/api/recipes`) — directory inside the repo; empty string means repo root. Non-recursive.
- `SAFEWAY_ZIP`, `ALDI_ZIP` (optional, used by `/api/deals`) — 5-digit ZIPs for Flipp flyer lookup; both default to `34238` when unset. Invalid values return 500.
- `ANTHROPIC_API_KEY` (required by `/api/generate-plan`) — Anthropic API key (paid; no free tier). Get one at https://console.anthropic.com. Never interpolate its value into error messages.
- `RESEND_*` — listed but not consumed until #70 adds `/api/email`.

Each future feature issue adds the env vars it consumes in the same PR that introduces the consumer.
