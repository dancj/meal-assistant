# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meal Assistant: automatically generates a weekly meal plan (5 dinners + grocery list) from household recipes and delivers it via email. Designed to run as a scheduled GitHub Action calling a Vercel-hosted API route, with an on-demand trigger option.

## Commands

- `npm run dev` — Start dev server with Turbopack
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm start` — Start production server

No test framework is configured yet.

## Architecture

- **Framework:** Next.js 15 with App Router, React 19, TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 via PostCSS (CSS-based config with `@theme` directives, no `tailwind.config.ts`)
- **Path alias:** `@/*` maps to `./src/*`
- **Deployment:** Vercel (free tier)

### Source Layout

All source code lives under `src/` using the Next.js App Router convention:
- Pages and layouts: `src/app/`
- API routes: `src/app/api/[route]/route.ts`
- Shared clients/utilities: `src/lib/`
- TypeScript types: `src/types/`

### Tech Stack (All Free Tier)

- **Storage:** Supabase (Postgres) via `@supabase/supabase-js` — recipe database
- **LLM:** Google Gemini via `@google/genai` — meal plan generation
- **Email:** Resend via `resend` — meal plan delivery
- **Automation:** GitHub Actions (weekly cron) + on-demand API endpoint

### Core Workflow

1. Trigger fires (GitHub Actions weekly cron or on-demand POST)
2. `POST /api/generate-plan` fetches recipes from Supabase
3. Sends recipes + dietary preferences to Google Gemini
4. Gemini returns structured JSON: 5 dinners + consolidated grocery list
5. Formats and emails the plan via Resend

### Environment Variables

See `.env.example` for required keys: Supabase credentials, Gemini API key, Resend API key, email config, and CRON_SECRET for endpoint protection.
