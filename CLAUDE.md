# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meal Assistant: automatically generates a weekly meal plan from custom recipes (stored in Google Sheets), uses OpenAI GPT to create the plan, and delivers it via email (Gmail API). Designed to run as a scheduled GitHub Action calling a Vercel-hosted API route.

## Commands

- `npm run dev` — Start dev server with Turbopack
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm start` — Start production server

No test framework is configured yet.

## Architecture

- **Framework:** Next.js 15 with App Router, React 19, TypeScript
- **Styling:** Tailwind CSS v4 via PostCSS
- **Path alias:** `@/*` maps to `./src/*`

### Source Layout

All source code lives in `src/app/` using the Next.js App Router convention. API routes should be created as `src/app/api/[route]/route.ts`.

### Planned Workflow

1. GitHub Action triggers weekly → calls `/api/generate-plan`
2. API route fetches recipes from Google Sheets (`googleapis`)
3. Sends recipes to OpenAI GPT to generate a meal plan (`openai`)
4. Emails the plan via Gmail API (`nodemailer`)

### Key Dependencies

- `openai` — OpenAI API client for meal plan generation
- `googleapis` — Google Sheets (recipe storage) and Calendar integration
- `nodemailer` — Email delivery via Gmail
- `axios` — HTTP client

### Environment Variables

See `sample.env.local` for required keys: Google service account credentials, Sheet ID, Gmail OAuth credentials, and OpenAI API key.
