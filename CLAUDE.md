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
- `src/app/` — pages, layouts, and future API routes (`src/app/api/[route]/route.ts`)
- `src/components/` — UI components (shadcn primitives under `src/components/ui/`)
- `src/lib/` — shared utilities. Currently: `resend.ts` (lazy Resend client factory, retained for #70), `email.ts` (`parseRecipients` helper), `utils.ts` (`cn` className merger)
- `src/test/` — Vitest setup
- `docs/plans/` — dated implementation plans
- `docs/brainstorms/` — requirements / discovery docs
- `docs/solutions/` — past bugs and best practices, organized by category with YAML frontmatter
- `docs/design-system.md` — design system reference

Feature-specific directories (`src/types/`, `src/lib/storage/`, etc.) will be reintroduced by the feature PRs that need them. Do not pre-create them.

### Active Work

The new stack is being built feature-by-feature. Each open issue owns its own endpoint, env vars, types, and docs:

- **#64** — `/api/recipes`: read markdown recipes from a private GitHub repo (`GITHUB_PAT`, `RECIPES_REPO`, `RECIPES_PATH`)
- **#65** — `/api/deals`: Safeway + Aldi deals via Flipp backend (`SAFEWAY_ZIP`, `ALDI_ZIP`)
- **#66** — `/api/generate-plan`: Claude-powered plan generation with store context (`ANTHROPIC_API_KEY`)
- **#67** — Single-page UI: deals sidebar, 5 meal cards, store-grouped grocery list
- **#68** — `/api/log`: meal logging to monthly files in the recipes repo
- **#69** — Pantry awareness: read `/pantry.md`, exclude staples from grocery list
- **#70** — Optional `/api/email` via Resend, gated on `RESEND_API_KEY`

When starting work, check the relevant issue for its shape contracts (recipe schema, meal plan schema, etc.) — they are the source of truth, not old plan files.

### Environment Variables

See `.env.example`. Currently only `RESEND_*` keys are listed (and they are only consumed once #70 lands). Each feature issue adds the env vars it consumes in the same PR that introduces the consumer.
