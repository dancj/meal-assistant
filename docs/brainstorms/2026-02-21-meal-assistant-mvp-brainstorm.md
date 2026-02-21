# Meal Assistant MVP Brainstorm

**Date:** 2026-02-21
**Status:** Complete

## What We're Building

A meal planning assistant that:
- Stores household recipes in a database (Supabase)
- Uses an LLM (Google Gemini free tier) to generate a weekly meal plan of 5 dinners + a consolidated grocery list
- Delivers the plan via email (Resend free tier)
- Runs automatically on a weekly schedule (GitHub Actions) with an on-demand trigger option
- Provides a simple web UI for managing recipes

The tool is built for a household with configurable dietary preferences (e.g., picky kid needs vegetarian alternatives / pasta fallbacks). It's an open-source project others can fork and deploy.

## Why These Choices

### Supabase (Storage)
- Free tier: 500MB storage, 50K rows — more than enough for a recipe database
- Postgres-based with a great JS SDK for Next.js
- Built-in auth available if multi-user support is needed later
- Recipes are scattered across paper, bookmarks, AnyList, and Google Docs — a database gives structure and a web UI for entry

### Google Gemini Free Tier (LLM)
- Truly free at this usage level (generating ~1 plan per week)
- 15 requests/min, 1M tokens/day on the free tier
- Quality is strong for structured meal plan generation
- Only requires a Google AI API key

### Resend Free Tier (Email)
- 100 emails/day free — more than enough for weekly plans
- Simple API, great developer experience
- Avoids the complexity of Gmail OAuth2 (consent screen, refresh tokens)

### Next.js on Vercel (Framework/Hosting)
- Already scaffolded — App Router, TypeScript, Tailwind CSS v4
- Free tier for hobby projects on Vercel
- API routes for backend logic, React for the recipe UI

## Key Decisions

1. **Storage:** Supabase (Postgres) over Google Sheets or flat files — structured data, web-editable, free tier
2. **LLM:** Google Gemini free tier over OpenAI — zero cost for weekly usage
3. **Email:** Resend over Gmail SMTP — simpler setup, no OAuth complexity
4. **Meal plan scope:** 5 dinners/week + grocery list (not full-day meals)
5. **Dietary preferences:** Configurable per-household — support for per-person overrides (e.g., kid-friendly alternatives)
6. **Trigger:** Both scheduled (GitHub Actions, weekly) and on-demand (button/API endpoint)
7. **UI:** Simple web UI for recipe management; meal plans delivered via email
8. **Build order:** Core pipeline first (storage -> LLM -> email), then UI, then automation

## Feature Priority (Build Order)

### P0 — Core Pipeline
1. **Recipe storage + API** — Supabase schema, CRUD API routes for recipes
2. **Meal plan generation** — Gemini integration, prompt engineering for 5 dinners + grocery list with dietary preferences
3. **Email delivery** — Resend integration, formatted meal plan email

### P1 — Usability
4. **Recipe management UI** — Simple web page to add/edit/view/delete recipes
5. **On-demand generation** — Button or page to trigger a new meal plan

### P2 — Automation & Polish
6. **Scheduled automation** — GitHub Actions workflow, weekly cron trigger
7. **Dietary preferences config** — UI or config for household member preferences (kid-friendly alternatives, etc.)

### P3 — Nice to Have (Future)
8. **Meal plan history** — Store past plans in Supabase, view history
9. **Calendar integration** — Add meals to Google Calendar
10. **Recipe import** — Parse recipes from URLs/bookmarks

## Resolved Questions

1. **Supabase recipe schema:** Detailed — name, ingredients (with quantities/units), instructions, tags, servings, prep time, cook time, source URL, notes
2. **Email recipients:** Configurable list of emails (via env var or Supabase config)
3. **Grocery list format:** Simple flat list — combined, deduplicated ingredients; let the LLM handle natural grouping

## Dependencies to Change

The current `package.json` includes `openai`, `googleapis`, `nodemailer`, and `axios`. Based on these decisions:
- **Remove:** `googleapis` (replaced by Supabase), `openai` (replaced by Gemini SDK or REST), `nodemailer` (replaced by Resend)
- **Add:** `@supabase/supabase-js`, `resend`, `@google/generative-ai` (or use REST via the existing `axios`)
- **Keep:** `axios` (useful for HTTP calls if not using provider SDKs)
