# Meal Assistant

A personal meal-planning app: pick dinners from a private recipe collection, build a store-grouped grocery list, optionally wire it into email.

> **Status: refactor in progress.** The original Supabase + Gemini + cron stack was stripped out (#63). The replacement stack — private GitHub recipe repo, Claude-powered generation, Safeway/Aldi deals, on-demand UI, optional Resend email — is being built across issues [#64–#70](https://github.com/dancj/meal-assistant/issues?q=is%3Aissue+is%3Aopen). Today, this repo is a Next.js + Tailwind + shadcn shell.

## Current Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 via PostCSS + shadcn UI primitives on `@base-ui/react`
- **Library retained for future use:** [Resend](https://resend.com) (wired in by #70)
- **Testing:** Vitest (unit) + Cypress (e2e)
- **Hosting target:** [Vercel](https://vercel.com) (free tier)

No database, LLM, or scheduled jobs exist in the tree today. Each capability lands with the issue that adds it.

## Getting Started

```bash
git clone https://github.com/dancj/meal-assistant.git
cd meal-assistant
npm install
cp .env.example .env.local   # only RESEND_* keys, used once #70 lands
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will see a placeholder page until feature work resumes.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (unit) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run cypress:open` | Cypress interactive |
| `npm run cypress:run` | Cypress headless |
| `npm run e2e` | Boot dev server + run Cypress headless |

## Roadmap

See the open issues for the active roadmap:

- [#64](https://github.com/dancj/meal-assistant/issues/64) — `/api/recipes` backed by a private GitHub recipe repo
- [#65](https://github.com/dancj/meal-assistant/issues/65) — `/api/deals` via Flipp (Safeway + Aldi)
- [#66](https://github.com/dancj/meal-assistant/issues/66) — `/api/generate-plan` powered by Claude with store context
- [#67](https://github.com/dancj/meal-assistant/issues/67) — single-page UI (deals sidebar, 5 meal cards, grocery list)
- [#68](https://github.com/dancj/meal-assistant/issues/68) — meal logging to monthly files in the recipes repo
- [#69](https://github.com/dancj/meal-assistant/issues/69) — pantry awareness (exclude staples from grocery list)
- [#70](https://github.com/dancj/meal-assistant/issues/70) — optional email delivery via Resend

## Contributing

Contributions are welcome. Please open an issue before opening a PR for non-trivial work.

## License

[MIT](LICENSE).
